/**
 * NeuralBrain.ts - Neural Network Brain Implementation
 *
 * Wraps the NeuralNetwork class to implement the Brain interface.
 */

import {
  Brain,
  BrainConfig,
  BrainOutput,
  BrainRegistry,
  BrainState,
  SensoryInput,
} from './Brain';
import { NeuralNetwork, NetworkWeights, NeuralNetworkConfig } from './NeuralNetwork';

export const NEURAL_BRAIN_TYPE = 'neural';
export const NEURAL_BRAIN_VERSION = 1;

interface NeuralBrainData {
  config: NeuralNetworkConfig;
  weights: NetworkWeights;
}

export class NeuralBrain implements Brain {
  readonly type = NEURAL_BRAIN_TYPE;
  readonly label?: string;

  private network: NeuralNetwork;
  private config: BrainConfig;

  constructor(config: BrainConfig = {}, network?: NeuralNetwork) {
    this.config = {
      inputSize: config.inputSize ?? 7,
      hiddenSize: config.hiddenSize ?? 8,
      outputSize: config.outputSize ?? 3,
      mutationRate: config.mutationRate ?? 0.1,
      mutationStrength: config.mutationStrength ?? 0.3,
      label: config.label,
    };
    this.label = config.label;

    if (network) {
      this.network = network;
    } else {
      this.network = new NeuralNetwork({
        inputSize: this.config.inputSize!,
        hiddenSize: this.config.hiddenSize!,
        outputSize: this.config.outputSize!,
      });
    }
  }

  think(inputs: SensoryInput): BrainOutput {
    const inputArray = [
      inputs.front,
      inputs.frontLeft,
      inputs.frontRight,
      inputs.left,
      inputs.right,
      inputs.energy,
      inputs.bias,
    ];

    const outputs = this.network.forward(inputArray);

    return {
      moveForward: outputs[0],
      rotate: outputs[1],
      action: outputs[2],
    };
  }

  mutate(mutationRate?: number, mutationStrength?: number): NeuralBrain {
    const rate = mutationRate ?? this.config.mutationRate ?? 0.1;
    const strength = mutationStrength ?? this.config.mutationStrength ?? 0.3;

    const mutatedNetwork = this.network.mutate(rate, strength);

    return new NeuralBrain(
      { ...this.config, label: this.label ? `${this.label}_mutant` : undefined },
      mutatedNetwork
    );
  }

  clone(): NeuralBrain {
    return new NeuralBrain({ ...this.config }, this.network.clone());
  }

  crossover(other: Brain): NeuralBrain {
    if (other.type !== NEURAL_BRAIN_TYPE) {
      throw new Error(`Cannot crossover NeuralBrain with ${other.type}`);
    }

    const otherNeural = other as NeuralBrain;
    const childNetwork = this.network.crossover(otherNeural.network);

    return new NeuralBrain(
      { ...this.config, label: this.label ? `${this.label}_child` : undefined },
      childNetwork
    );
  }

  serialize(): BrainState {
    const networkData = this.network.serialize();

    return {
      type: NEURAL_BRAIN_TYPE,
      version: NEURAL_BRAIN_VERSION,
      config: this.config,
      data: {
        config: networkData.config,
        weights: networkData.weights,
      } as NeuralBrainData,
    };
  }

  getComplexity(): number {
    return this.network.getParameterCount();
  }

  getNetwork(): NeuralNetwork {
    return this.network;
  }

  static fromState(state: BrainState): NeuralBrain {
    if (state.type !== NEURAL_BRAIN_TYPE) {
      throw new Error(`Expected ${NEURAL_BRAIN_TYPE}, got ${state.type}`);
    }

    const data = state.data as NeuralBrainData;
    const network = NeuralNetwork.deserialize({
      config: data.config,
      weights: data.weights,
    });

    return new NeuralBrain(state.config, network);
  }

  static createRandom(config?: BrainConfig): NeuralBrain {
    return new NeuralBrain(config);
  }
}

BrainRegistry.register(NEURAL_BRAIN_TYPE, NeuralBrain.fromState);
