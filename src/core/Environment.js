/**
 * Environment system for EcoSysX Core Engine
 * 
 * Contains all environmental logic separated from UI concerns.
 * Can run independently of React, Three.js, or any visualization framework.
 */

import { TIME_V1, hazardProbability } from './EcosystemEngine.js';

// ================================
// WEATHER SYSTEM
// ================================

export class WeatherSystem {
  constructor() {
    this.currentWeather = {
      temperature: 20, // Celsius
      humidity: 0.5,
      windSpeed: 5, // km/h
      precipitation: 0, // mm/h
      pressure: 1013, // hPa
      cloudCover: 0.3,
      visibility: 10000 // meters
    };
    
    this.weatherHistory = [];
    this.seasonalFactors = {
      temperatureCycle: 0,
      precipitationCycle: 0,
      humidityBaseline: 0.5
    };
    
    this.weatherPatterns = {
      frontSystems: [],
      storms: [],
      heatWaves: [],
      coldSnaps: []
    };
    
    this.weatherEffectCache = null;
    this.lastWeatherUpdate = 0;
  }

  update(currentStep) {
    // Update weather every few steps
    if (currentStep - this.lastWeatherUpdate >= 5) {
      this.updateWeatherConditions(currentStep);
      this.processWeatherPatterns(currentStep);
      this.lastWeatherUpdate = currentStep;
      this.weatherEffectCache = null; // Invalidate cache
    }
  }

  updateWeatherConditions(currentStep) {
    const timeDays = TIME_V1.stepToDays(currentStep);
    
    // Seasonal temperature variation
    const seasonalTemp = 20 + 15 * Math.sin((timeDays / 365.25) * 2 * Math.PI);
    
    // Daily temperature variation
    const dailyTemp = 8 * Math.sin((timeDays % 1) * 2 * Math.PI);
    
    // Weather noise
    const tempNoise = (Math.random() - 0.5) * 6;
    
    this.currentWeather.temperature = seasonalTemp + dailyTemp + tempNoise;
    
    // Humidity tends to be higher when cooler
    const tempFactor = Math.max(0.2, 1 - (this.currentWeather.temperature - 10) / 40);
    this.currentWeather.humidity = Math.max(0.1, Math.min(0.95, 
      this.seasonalFactors.humidityBaseline * tempFactor + (Math.random() - 0.5) * 0.3
    ));
    
    // Wind speed variation
    this.currentWeather.windSpeed = Math.max(0, 5 + (Math.random() - 0.5) * 15);
    
    // Precipitation based on humidity and temperature
    const precipitationChance = Math.max(0, this.currentWeather.humidity - 0.6) * 2;
    if (Math.random() < precipitationChance * 0.1) {
      this.currentWeather.precipitation = Math.random() * 20;
    } else {
      this.currentWeather.precipitation = Math.max(0, this.currentWeather.precipitation - 2);
    }
    
    // Cloud cover follows precipitation
    const targetCloudCover = this.currentWeather.precipitation > 0 ? 
      0.7 + Math.random() * 0.3 : 
      Math.random() * 0.6;
    
    this.currentWeather.cloudCover = this.currentWeather.cloudCover * 0.8 + targetCloudCover * 0.2;
    
    // Store weather history
    this.weatherHistory.push({
      step: currentStep,
      weather: { ...this.currentWeather }
    });
    
    // Keep only recent history
    if (this.weatherHistory.length > 100) {
      this.weatherHistory.shift();
    }
  }

  processWeatherPatterns(currentStep) {
    // Storm generation
    if (this.currentWeather.precipitation > 15 && this.currentWeather.windSpeed > 20) {
      const existingStorm = this.weatherPatterns.storms.find(s => !s.ended);
      if (!existingStorm && Math.random() < 0.3) {
        this.weatherPatterns.storms.push({
          startStep: currentStep,
          intensity: Math.random() * 0.8 + 0.2,
          duration: Math.floor(Math.random() * 20) + 10,
          ended: false
        });
      }
    }
    
    // Update active storms
    this.weatherPatterns.storms.forEach(storm => {
      if (!storm.ended && currentStep - storm.startStep > storm.duration) {
        storm.ended = true;
      }
    });
    
    // Heat wave detection
    if (this.currentWeather.temperature > 35) {
      const existingHeatWave = this.weatherPatterns.heatWaves.find(hw => !hw.ended);
      if (!existingHeatWave && Math.random() < 0.2) {
        this.weatherPatterns.heatWaves.push({
          startStep: currentStep,
          peakTemperature: this.currentWeather.temperature,
          duration: Math.floor(Math.random() * 30) + 20,
          ended: false
        });
      }
    }
    
    // Update heat waves
    this.weatherPatterns.heatWaves.forEach(heatWave => {
      if (!heatWave.ended && currentStep - heatWave.startStep > heatWave.duration) {
        heatWave.ended = true;
      }
    });
    
    // Cold snap detection
    if (this.currentWeather.temperature < -5) {
      const existingColdSnap = this.weatherPatterns.coldSnaps.find(cs => !cs.ended);
      if (!existingColdSnap && Math.random() < 0.15) {
        this.weatherPatterns.coldSnaps.push({
          startStep: currentStep,
          minTemperature: this.currentWeather.temperature,
          duration: Math.floor(Math.random() * 25) + 15,
          ended: false
        });
      }
    }
    
    // Update cold snaps
    this.weatherPatterns.coldSnaps.forEach(coldSnap => {
      if (!coldSnap.ended && currentStep - coldSnap.startStep > coldSnap.duration) {
        coldSnap.ended = true;
      }
    });
  }

  getWeatherEffects() {
    if (this.weatherEffectCache) {
      return this.weatherEffectCache;
    }
    
    const effects = {
      energyConsumptionMultiplier: 1.0,
      movementSpeedMultiplier: 1.0,
      infectionSpreadMultiplier: 1.0,
      shelterNeed: 0.0,
      visibilityReduction: 0.0
    };
    
    // Temperature effects
    if (this.currentWeather.temperature < 0) {
      effects.energyConsumptionMultiplier += 0.3;
      effects.movementSpeedMultiplier *= 0.8;
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.6);
    } else if (this.currentWeather.temperature > 35) {
      effects.energyConsumptionMultiplier += 0.2;
      effects.movementSpeedMultiplier *= 0.9;
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.4);
    }
    
    // Precipitation effects
    if (this.currentWeather.precipitation > 5) {
      effects.movementSpeedMultiplier *= 0.85;
      effects.visibilityReduction += 0.2;
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.3);
    }
    
    if (this.currentWeather.precipitation > 15) {
      effects.movementSpeedMultiplier *= 0.7;
      effects.visibilityReduction += 0.4;
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.7);
    }
    
    // Wind effects
    if (this.currentWeather.windSpeed > 25) {
      effects.energyConsumptionMultiplier += 0.15;
      effects.movementSpeedMultiplier *= 0.9;
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.5);
    }
    
    // Humidity effects on disease spread
    if (this.currentWeather.humidity > 0.7) {
      effects.infectionSpreadMultiplier *= 1.2;
    } else if (this.currentWeather.humidity < 0.3) {
      effects.infectionSpreadMultiplier *= 0.8;
    }
    
    // Active weather pattern effects
    const activeStorm = this.weatherPatterns.storms.find(s => !s.ended);
    if (activeStorm) {
      effects.energyConsumptionMultiplier += 0.4 * activeStorm.intensity;
      effects.movementSpeedMultiplier *= (1 - 0.3 * activeStorm.intensity);
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.8 * activeStorm.intensity);
      effects.visibilityReduction += 0.5 * activeStorm.intensity;
    }
    
    const activeHeatWave = this.weatherPatterns.heatWaves.find(hw => !hw.ended);
    if (activeHeatWave) {
      effects.energyConsumptionMultiplier += 0.3;
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.6);
    }
    
    const activeColdSnap = this.weatherPatterns.coldSnaps.find(cs => !cs.ended);
    if (activeColdSnap) {
      effects.energyConsumptionMultiplier += 0.5;
      effects.movementSpeedMultiplier *= 0.7;
      effects.shelterNeed = Math.max(effects.shelterNeed, 0.8);
    }
    
    this.weatherEffectCache = effects;
    return effects;
  }

  getWeatherSummary() {
    return {
      temperature: Math.round(this.currentWeather.temperature * 10) / 10,
      condition: this.determineWeatherCondition(),
      windSpeed: Math.round(this.currentWeather.windSpeed),
      humidity: Math.round(this.currentWeather.humidity * 100),
      precipitation: Math.round(this.currentWeather.precipitation * 10) / 10,
      activePatterns: this.getActivePatterns()
    };
  }

  determineWeatherCondition() {
    if (this.currentWeather.precipitation > 15) return 'Heavy Rain';
    if (this.currentWeather.precipitation > 5) return 'Light Rain';
    if (this.currentWeather.cloudCover > 0.8) return 'Overcast';
    if (this.currentWeather.cloudCover > 0.5) return 'Partly Cloudy';
    if (this.currentWeather.temperature > 35) return 'Hot';
    if (this.currentWeather.temperature < 0) return 'Freezing';
    return 'Clear';
  }

  getActivePatterns() {
    const patterns = [];
    
    if (this.weatherPatterns.storms.some(s => !s.ended)) {
      patterns.push('Storm');
    }
    if (this.weatherPatterns.heatWaves.some(hw => !hw.ended)) {
      patterns.push('Heat Wave');
    }
    if (this.weatherPatterns.coldSnaps.some(cs => !cs.ended)) {
      patterns.push('Cold Snap');
    }
    
    return patterns;
  }
}

// ================================
// TERRAIN SYSTEM
// ================================

export class TerrainSystem {
  constructor() {
    this.terrainFeatures = new Map();
    this.elevationMap = new Map();
    this.vegetationMap = new Map();
    this.waterBodies = new Map();
    this.shelterAreas = new Map();
    
    this.generateTerrain();
  }

  generateTerrain() {
    // Generate elevation map
    for (let x = -25; x <= 25; x += 2) {
      for (let z = -25; z <= 25; z += 2) {
        const key = `${x},${z}`;
        const elevation = this.generateElevation(x, z);
        this.elevationMap.set(key, elevation);
        
        // Generate vegetation based on elevation and moisture
        const vegetation = this.generateVegetation(x, z, elevation);
        this.vegetationMap.set(key, vegetation);
        
        // Place water bodies in lower areas
        if (elevation < 0.2 && Math.random() < 0.3) {
          this.waterBodies.set(key, {
            type: 'pond',
            size: Math.random() * 3 + 1,
            depth: Math.random() * 2 + 0.5
          });
        }
        
        // Create shelter areas (caves, dense forest, rocks)
        if (Math.random() < 0.15) {
          let shelterType = 'rocks';
          if (vegetation.density > 0.7) shelterType = 'dense_forest';
          if (elevation > 0.8) shelterType = 'cave';
          
          this.shelterAreas.set(key, {
            type: shelterType,
            capacity: Math.floor(Math.random() * 4) + 2,
            weatherProtection: this.getShelterProtection(shelterType)
          });
        }
      }
    }
  }

  generateElevation(x, z) {
    // Use Perlin-like noise for realistic terrain
    const scale1 = 0.1;
    const scale2 = 0.05;
    const scale3 = 0.02;
    
    const noise1 = Math.sin(x * scale1) * Math.cos(z * scale1);
    const noise2 = Math.sin(x * scale2) * Math.cos(z * scale2) * 0.5;
    const noise3 = Math.sin(x * scale3) * Math.cos(z * scale3) * 0.3;
    
    let elevation = (noise1 + noise2 + noise3) * 0.5 + 0.5;
    elevation = Math.max(0, Math.min(1, elevation));
    
    return elevation;
  }

  generateVegetation(x, z, elevation) {
    const moistureFactor = 1 - elevation * 0.6; // Lower areas are more moist
    const temperatureFactor = 1 - Math.abs(x) / 25; // Simulate latitude effect
    
    const density = Math.max(0, Math.min(1, 
      moistureFactor * temperatureFactor + (Math.random() - 0.5) * 0.3
    ));
    
    let type = 'grass';
    if (density > 0.7) type = 'forest';
    else if (density > 0.4) type = 'shrubland';
    else if (density < 0.2) type = 'sparse';
    
    return {
      type,
      density,
      height: density * 3 + 0.5,
      seasonal: Math.random() > 0.3 // Some vegetation is seasonal
    };
  }

  getShelterProtection(shelterType) {
    switch (shelterType) {
      case 'cave': return 0.9;
      case 'dense_forest': return 0.6;
      case 'rocks': return 0.4;
      default: return 0.1;
    }
  }

  getTerrainEffects(position) {
    const x = Math.round(position.x / 2) * 2;
    const z = Math.round(position.z / 2) * 2;
    const key = `${x},${z}`;
    
    const elevation = this.elevationMap.get(key) || 0.5;
    const vegetation = this.vegetationMap.get(key) || { type: 'grass', density: 0.3 };
    const waterBody = this.waterBodies.get(key);
    const shelter = this.shelterAreas.get(key);
    
    const effects = {
      elevation,
      movementSpeedMultiplier: 1.0,
      energyBonus: 0,
      infectionRiskModifier: 0,
      weatherExposureMultiplier: 1.0,
      weatherProtection: 0,
      isInShelter: false,
      resourceMultiplier: 1.0,
      hidingBonus: 0
    };
    
    // Elevation effects
    if (elevation > 0.8) {
      effects.movementSpeedMultiplier *= 0.85; // Harder to move uphill
      effects.weatherExposureMultiplier *= 1.3; // More exposed
    } else if (elevation < 0.3) {
      effects.movementSpeedMultiplier *= 1.1; // Easier to move in valleys
      effects.infectionRiskModifier += 0.1; // More humid, higher infection risk
    }
    
    // Vegetation effects
    switch (vegetation.type) {
      case 'forest':
        effects.weatherExposureMultiplier *= 0.7;
        effects.hidingBonus += 0.3;
        effects.movementSpeedMultiplier *= 0.9;
        effects.resourceMultiplier *= 1.3;
        break;
      case 'shrubland':
        effects.weatherExposureMultiplier *= 0.85;
        effects.hidingBonus += 0.1;
        effects.resourceMultiplier *= 1.1;
        break;
      case 'sparse':
        effects.weatherExposureMultiplier *= 1.2;
        effects.movementSpeedMultiplier *= 1.1;
        effects.resourceMultiplier *= 0.7;
        break;
    }
    
    // Water body effects
    if (waterBody) {
      effects.energyBonus += 0.5; // Access to water
      effects.infectionRiskModifier += 0.2; // Standing water can harbor pathogens
      effects.resourceMultiplier *= 1.2;
    }
    
    // Shelter effects
    if (shelter) {
      effects.isInShelter = true;
      effects.weatherProtection = shelter.weatherProtection;
      effects.weatherExposureMultiplier *= (1 - shelter.weatherProtection);
      effects.hidingBonus += shelter.weatherProtection * 0.4;
    }
    
    return effects;
  }

  findNearestShelter(position, maxDistance = 10) {
    let nearestShelter = null;
    let minDistance = Infinity;
    
    this.shelterAreas.forEach((shelter, key) => {
      const [x, z] = key.split(',').map(Number);
      const distance = Math.sqrt(
        Math.pow(position.x - x, 2) + Math.pow(position.z - z, 2)
      );
      
      if (distance < minDistance && distance <= maxDistance) {
        minDistance = distance;
        nearestShelter = {
          position: { x, z },
          distance,
          shelter
        };
      }
    });
    
    return nearestShelter;
  }

  getTerrainSummary(position) {
    const effects = this.getTerrainEffects(position);
    const x = Math.round(position.x / 2) * 2;
    const z = Math.round(position.z / 2) * 2;
    const key = `${x},${z}`;
    
    const vegetation = this.vegetationMap.get(key) || { type: 'grass', density: 0.3 };
    const waterBody = this.waterBodies.get(key);
    const shelter = this.shelterAreas.get(key);
    
    return {
      elevation: Math.round(effects.elevation * 100),
      vegetation: vegetation.type,
      vegetationDensity: Math.round(vegetation.density * 100),
      hasWater: !!waterBody,
      hasShelter: !!shelter,
      shelterType: shelter?.type,
      weatherProtection: Math.round((effects.weatherProtection || 0) * 100)
    };
  }
}

// ================================
// RESOURCE SYSTEM
// ================================

export class ResourceSystem {
  constructor() {
    this.resources = new Map();
    this.resourceIdCounter = 0;
    this.maxResources = 25;
    this.spawnCooldown = 0;
    this.lastSpawnStep = 0;
  }

  update(currentStep, weatherSystem, terrainSystem) {
    this.spawnCooldown = Math.max(0, this.spawnCooldown - 1);
    
    // Spawn new resources
    if (this.resources.size < this.maxResources && this.spawnCooldown === 0) {
      this.spawnResource(weatherSystem, terrainSystem);
      this.spawnCooldown = 15 + Math.floor(Math.random() * 10);
    }
    
    // Age existing resources
    this.resources.forEach((resource, id) => {
      resource.age++;
      
      // Resources decay over time
      if (resource.age > resource.maxAge) {
        if (Math.random() < 0.3) {
          this.resources.delete(id);
        }
      }
      
      // Some resources replenish
      if (resource.replenishable && resource.age % 20 === 0) {
        resource.value = Math.min(resource.maxValue, resource.value + 2);
      }
    });
  }

  spawnResource(weatherSystem, terrainSystem) {
    const x = (Math.random() - 0.5) * 40;
    const z = (Math.random() - 0.5) * 40;
    const position = { x, y: 1, z };
    
    const terrainEffects = terrainSystem.getTerrainEffects(position);
    const weatherEffects = weatherSystem.getWeatherEffects();
    
    // Resource type based on terrain
    let type = 'berry';
    let baseValue = 8 + Math.random() * 7;
    let maxAge = 80 + Math.floor(Math.random() * 40);
    let weatherResistant = false;
    let replenishable = false;
    
    if (terrainEffects.elevation > 0.7) {
      type = 'mineral';
      baseValue = 15 + Math.random() * 10;
      maxAge = 200 + Math.floor(Math.random() * 100);
      weatherResistant = true;
      replenishable = false;
    } else if (terrainEffects.isInShelter) {
      type = 'mushroom';
      baseValue = 12 + Math.random() * 8;
      maxAge = 60 + Math.floor(Math.random() * 30);
      weatherResistant = true;
      replenishable = true;
    } else if (Math.random() < 0.3) {
      type = 'seed';
      baseValue = 5 + Math.random() * 5;
      maxAge = 120 + Math.floor(Math.random() * 80);
      weatherResistant = false;
      replenishable = false;
    }
    
    // Adjust value based on terrain
    const finalValue = baseValue * terrainEffects.resourceMultiplier;
    
    // Weather can affect spawn quality
    if (weatherEffects.shelterNeed > 0.5 && !weatherResistant) {
      if (Math.random() < 0.4) return; // Don't spawn in bad weather
    }
    
    const resource = {
      id: `resource_${this.resourceIdCounter++}`,
      position,
      type,
      value: finalValue,
      maxValue: finalValue,
      age: 0,
      maxAge,
      weatherResistant,
      replenishable,
      quality: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
      discovered: false
    };
    
    this.resources.set(resource.id, resource);
  }

  consumeResource(resourceId) {
    const resource = this.resources.get(resourceId);
    if (!resource) return 0;
    
    const consumedValue = resource.value;
    
    if (resource.replenishable) {
      resource.value = Math.max(0, resource.value - 5);
      if (resource.value <= 0) {
        resource.age += 20; // Speed up aging when depleted
      }
    } else {
      this.resources.delete(resourceId);
    }
    
    return consumedValue;
  }

  getResourcesInRange(position, range) {
    const resourcesInRange = [];
    
    this.resources.forEach((resource, id) => {
      const distance = Math.sqrt(
        Math.pow(position.x - resource.position.x, 2) +
        Math.pow(position.z - resource.position.z, 2)
      );
      
      if (distance <= range) {
        resourcesInRange.push({
          ...resource,
          distance
        });
      }
    });
    
    return resourcesInRange.sort((a, b) => a.distance - b.distance);
  }

  getResourceSummary() {
    const summary = {
      total: this.resources.size,
      byType: {},
      averageValue: 0,
      totalValue: 0
    };
    
    let totalValue = 0;
    
    this.resources.forEach(resource => {
      if (!summary.byType[resource.type]) {
        summary.byType[resource.type] = 0;
      }
      summary.byType[resource.type]++;
      totalValue += resource.value;
    });
    
    summary.totalValue = totalValue;
    summary.averageValue = this.resources.size > 0 ? totalValue / this.resources.size : 0;
    
    return summary;
  }
}

// ================================
// MAIN ENVIRONMENT CLASS
// ================================

export class Environment {
  constructor() {
    this.weatherSystem = new WeatherSystem();
    this.terrainSystem = new TerrainSystem();
    this.resourceSystem = new ResourceSystem();
    
    this.environmentalStress = {
      heatStress: 0,
      coldStress: 0,
      stormStress: 0,
      droughtStress: 0,
      overallStress: 0
    };
    
    this.lastStressUpdate = 0;
  }

  update(currentStep) {
    this.weatherSystem.update(currentStep);
    this.resourceSystem.update(currentStep, this.weatherSystem, this.terrainSystem);
    
    // Update environmental stress every few steps
    if (currentStep - this.lastStressUpdate >= 3) {
      this.updateEnvironmentalStress();
      this.lastStressUpdate = currentStep;
    }
  }

  updateEnvironmentalStress() {
    const weather = this.weatherSystem.currentWeather;
    const patterns = this.weatherSystem.weatherPatterns;
    
    // Heat stress
    this.environmentalStress.heatStress = Math.max(0, (weather.temperature - 30) / 15);
    
    // Cold stress
    this.environmentalStress.coldStress = Math.max(0, (5 - weather.temperature) / 15);
    
    // Storm stress
    const activeStorm = patterns.storms.find(s => !s.ended);
    this.environmentalStress.stormStress = activeStorm ? activeStorm.intensity : 0;
    
    // Drought stress (based on recent precipitation)
    const recentWeather = this.weatherSystem.weatherHistory.slice(-20);
    const avgPrecipitation = recentWeather.length > 0 ? 
      recentWeather.reduce((sum, w) => sum + w.weather.precipitation, 0) / recentWeather.length : 5;
    this.environmentalStress.droughtStress = Math.max(0, (3 - avgPrecipitation) / 3);
    
    // Overall stress
    this.environmentalStress.overallStress = (
      this.environmentalStress.heatStress +
      this.environmentalStress.coldStress +
      this.environmentalStress.stormStress +
      this.environmentalStress.droughtStress
    ) / 4;
  }

  getWeatherEffects() {
    return this.weatherSystem.getWeatherEffects();
  }

  getTerrainEffects(position) {
    return this.terrainSystem.getTerrainEffects(position);
  }

  get resources() {
    return this.resourceSystem.resources;
  }

  consumeResource(resourceId) {
    return this.resourceSystem.consumeResource(resourceId);
  }

  getResourcesInRange(position, range) {
    return this.resourceSystem.getResourcesInRange(position, range);
  }

  findNearestShelter(position, maxDistance = 10) {
    return this.terrainSystem.findNearestShelter(position, maxDistance);
  }

  getEnvironmentSummary(position = null) {
    const summary = {
      weather: this.weatherSystem.getWeatherSummary(),
      resources: this.resourceSystem.getResourceSummary(),
      environmentalStress: { ...this.environmentalStress }
    };
    
    if (position) {
      summary.terrain = this.terrainSystem.getTerrainSummary(position);
    }
    
    return summary;
  }

  // For UI compatibility
  getEnvironmentState() {
    return {
      weather: this.weatherSystem.currentWeather,
      activePatterns: this.weatherSystem.getActivePatterns(),
      resources: Array.from(this.resources.values()),
      environmentalStress: this.environmentalStress
    };
  }
}

export default { Environment, WeatherSystem, TerrainSystem, ResourceSystem };