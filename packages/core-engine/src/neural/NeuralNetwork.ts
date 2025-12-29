/**
 * NeuralNetwork.ts - Core Feedforward Neural Network
 *
 * Ported from digital-organisms simulation.js NeuralNetwork class.
 * Implements a simple feedforward neural network with:
 * - Configurable input, hidden, and output layers
 * - Tanh activation function
 * - Mutation support for evolutionary algorithms
 */

// ============================================================================
// Types
// ============================================================================

export interface NetworkWeights {
  inputToHidden: number[][];
  hiddenToOutput: number[][];
  hiddenBias: number[];
  outputBias: number[];
}

export interface NeuralNetworkConfig {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
}

export const DEFAULT_NETWORK_CONFIG: NeuralNetworkConfig = {
  inputSize: 7,
  hiddenSize: 8,
  outputSize: 3,
};

// ============================================================================
// Neural Network Class
// ============================================================================

export class NeuralNetwork {
  readonly inputSize: number;
  readonly hiddenSize: number;
  readonly outputSize: number;

  private inputToHidden: number[][];
  private hiddenToOutput: number[][];
  private hiddenBias: number[];
  private outputBias: number[];

  constructor(
    config: Partial<NeuralNetworkConfig> = {},
    weights?: NetworkWeights
  ) {
    const fullConfig = { ...DEFAULT_NETWORK_CONFIG, ...config };
    this.inputSize = fullConfig.inputSize;
    this.hiddenSize = fullConfig.hiddenSize;
    this.outputSize = fullConfig.outputSize;

    if (weights) {
      this.inputToHidden = this.deepCopy2D(weights.inputToHidden);
      this.hiddenToOutput = this.deepCopy2D(weights.hiddenToOutput);
      this.hiddenBias = [...weights.hiddenBias];
      this.outputBias = [...weights.outputBias];
    } else {
      this.inputToHidden = this.initializeWeights(this.inputSize, this.hiddenSize);
      this.hiddenToOutput = this.initializeWeights(this.hiddenSize, this.outputSize);
      this.hiddenBias = this.initializeBias(this.hiddenSize);
      this.outputBias = this.initializeBias(this.outputSize);
    }
  }

  private initializeWeights(inputSize: number, outputSize: number): number[][] {
    const weights: number[][] = [];
    const variance = 2 / (inputSize + outputSize);
    const stddev = Math.sqrt(variance);

    for (let i = 0; i < inputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < outputSize; j++) {
        weights[i][j] = this.randomGaussian() * stddev;
      }
    }
    return weights;
  }

  private initializeBias(size: number): number[] {
    const bias: number[] = [];
    for (let i = 0; i < size; i++) {
      bias[i] = (Math.random() - 0.5) * 0.1;
    }
    return bias;
  }

  private randomGaussian(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private deepCopy2D(arr: number[][]): number[][] {
    return arr.map(row => [...row]);
  }

  private tanh(x: number): number {
    return Math.tanh(x);
  }

  forward(inputs: number[]): number[] {
    if (inputs.length !== this.inputSize) {
      throw new Error(`Input size mismatch: expected ${this.inputSize}, got ${inputs.length}`);
    }

    const hidden: number[] = new Array(this.hiddenSize);
    for (let h = 0; h < this.hiddenSize; h++) {
      let sum = this.hiddenBias[h];
      for (let i = 0; i < this.inputSize; i++) {
        sum += inputs[i] * this.inputToHidden[i][h];
      }
      hidden[h] = this.tanh(sum);
    }

    const outputs: number[] = new Array(this.outputSize);
    for (let o = 0; o < this.outputSize; o++) {
      let sum = this.outputBias[o];
      for (let h = 0; h < this.hiddenSize; h++) {
        sum += hidden[h] * this.hiddenToOutput[h][o];
      }
      outputs[o] = this.tanh(sum);
    }

    return outputs;
  }

  mutate(mutationRate: number = 0.1, mutationStrength: number = 0.3): NeuralNetwork {
    const mutatedWeights: NetworkWeights = {
      inputToHidden: this.mutateMatrix(this.inputToHidden, mutationRate, mutationStrength),
      hiddenToOutput: this.mutateMatrix(this.hiddenToOutput, mutationRate, mutationStrength),
      hiddenBias: this.mutateArray(this.hiddenBias, mutationRate, mutationStrength),
      outputBias: this.mutateArray(this.outputBias, mutationRate, mutationStrength),
    };

    return new NeuralNetwork(
      { inputSize: this.inputSize, hiddenSize: this.hiddenSize, outputSize: this.outputSize },
      mutatedWeights
    );
  }

  private mutateMatrix(matrix: number[][], rate: number, strength: number): number[][] {
    return matrix.map(row =>
      row.map(weight =>
        Math.random() < rate ? weight + this.randomGaussian() * strength : weight
      )
    );
  }

  private mutateArray(arr: number[], rate: number, strength: number): number[] {
    return arr.map(val =>
      Math.random() < rate ? val + this.randomGaussian() * strength : val
    );
  }

  crossover(other: NeuralNetwork): NeuralNetwork {
    if (
      this.inputSize !== other.inputSize ||
      this.hiddenSize !== other.hiddenSize ||
      this.outputSize !== other.outputSize
    ) {
      throw new Error('Cannot crossover networks with different architectures');
    }

    const crossoverWeights: NetworkWeights = {
      inputToHidden: this.crossoverMatrix(this.inputToHidden, other.inputToHidden),
      hiddenToOutput: this.crossoverMatrix(this.hiddenToOutput, other.hiddenToOutput),
      hiddenBias: this.crossoverArray(this.hiddenBias, other.hiddenBias),
      outputBias: this.crossoverArray(this.outputBias, other.outputBias),
    };

    return new NeuralNetwork(
      { inputSize: this.inputSize, hiddenSize: this.hiddenSize, outputSize: this.outputSize },
      crossoverWeights
    );
  }

  private crossoverMatrix(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) =>
      row.map((val, j) => (Math.random() < 0.5 ? val : b[i][j]))
    );
  }

  private crossoverArray(a: number[], b: number[]): number[] {
    return a.map((val, i) => (Math.random() < 0.5 ? val : b[i]));
  }

  clone(): NeuralNetwork {
    return new NeuralNetwork(
      { inputSize: this.inputSize, hiddenSize: this.hiddenSize, outputSize: this.outputSize },
      this.getWeights()
    );
  }

  getWeights(): NetworkWeights {
    return {
      inputToHidden: this.deepCopy2D(this.inputToHidden),
      hiddenToOutput: this.deepCopy2D(this.hiddenToOutput),
      hiddenBias: [...this.hiddenBias],
      outputBias: [...this.outputBias],
    };
  }

  setWeights(weights: NetworkWeights): void {
    this.inputToHidden = this.deepCopy2D(weights.inputToHidden);
    this.hiddenToOutput = this.deepCopy2D(weights.hiddenToOutput);
    this.hiddenBias = [...weights.hiddenBias];
    this.outputBias = [...weights.outputBias];
  }

  getParameterCount(): number {
    return (
      this.inputSize * this.hiddenSize +
      this.hiddenSize * this.outputSize +
      this.hiddenSize +
      this.outputSize
    );
  }

  serialize(): { config: NeuralNetworkConfig; weights: NetworkWeights } {
    return {
      config: {
        inputSize: this.inputSize,
        hiddenSize: this.hiddenSize,
        outputSize: this.outputSize,
      },
      weights: this.getWeights(),
    };
  }

  static deserialize(data: { config: NeuralNetworkConfig; weights: NetworkWeights }): NeuralNetwork {
    return new NeuralNetwork(data.config, data.weights);
  }

  static createRandom(config?: Partial<NeuralNetworkConfig>): NeuralNetwork {
    return new NeuralNetwork(config);
  }
}
