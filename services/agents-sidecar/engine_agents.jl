using Agents
using Random
using Distributions
using LinearAlgebra
using SHA
using JSON3

"""
EcosystemAgent for Agents.jl implementation
Represents an individual agent in the ecosystem simulation
"""
@agent EcosystemAgent GridAgent{2} begin
    # Agent ID (inherited from GridAgent)
    # pos::Tuple{Int,Int} (inherited from GridAgent)
    
    # Basic properties
    energy::Float64
    age::Int
    max_age::Int
    
    # Movement properties
    speed::Float64
    movement_cost::Float64
    
    # Disease model (SIR)
    health_status::Symbol  # :susceptible, :infected, :recovered, :dead
    infection_duration::Int
    infection_start_step::Int
    recovery_probability::Float64
    transmission_probability::Float64
    death_probability::Float64
    
    # Reproduction properties
    reproduction_threshold::Float64
    reproduction_cost::Float64
    reproduction_probability::Float64
    offspring_energy::Float64
    
    # Genetics (simple traits)
    traits::Dict{String, Float64}
    
    # Spatial awareness
    perception_range::Int
    
    # Behavioral state
    behavior_state::Symbol  # :foraging, :resting, :reproducing, :fleeing
    last_reproduction_step::Int
    
    # Resource interaction
    resource_efficiency::Float64
    waste_production::Float64
end

"""
Initialize EcosystemAgent with default values
"""
function EcosystemAgent(id::Int, pos::Tuple{Int,Int}; 
                       energy::Float64=100.0,
                       age::Int=0,
                       max_age::Int=1000,
                       speed::Float64=1.0,
                       movement_cost::Float64=1.0,
                       health_status::Symbol=:susceptible,
                       infection_duration::Int=0,
                       infection_start_step::Int=0,
                       recovery_probability::Float64=0.1,
                       transmission_probability::Float64=0.05,
                       death_probability::Float64=0.01,
                       reproduction_threshold::Float64=150.0,
                       reproduction_cost::Float64=50.0,
                       reproduction_probability::Float64=0.3,
                       offspring_energy::Float64=75.0,
                       traits::Dict{String, Float64}=Dict("adaptation"=>0.5),
                       perception_range::Int=3,
                       behavior_state::Symbol=:foraging,
                       last_reproduction_step::Int=0,
                       resource_efficiency::Float64=1.0,
                       waste_production::Float64=0.1)
    
    return EcosystemAgent(id, pos, energy, age, max_age, speed, movement_cost,
                         health_status, infection_duration, infection_start_step,
                         recovery_probability, transmission_probability, death_probability,
                         reproduction_threshold, reproduction_cost, reproduction_probability,
                         offspring_energy, traits, perception_range, behavior_state,
                         last_reproduction_step, resource_efficiency, waste_production)
end

"""
Agent step function - called for each agent each time step
"""
function agent_step!(agent::EcosystemAgent, model::ABM)
    # Aging and natural death
    agent.age += 1
    if agent.age >= agent.max_age || agent.energy <= 0
        remove_agent!(agent, model)
        return
    end
    
    # Health status updates
    update_health_status!(agent, model)
    
    # Death from disease
    if agent.health_status == :dead
        remove_agent!(agent, model)
        return
    end
    
    # Behavioral decision making
    choose_behavior!(agent, model)
    
    # Execute behavior
    if agent.behavior_state == :foraging
        forage!(agent, model)
    elseif agent.behavior_state == :reproducing
        attempt_reproduction!(agent, model)
    elseif agent.behavior_state == :resting
        rest!(agent, model)
    elseif agent.behavior_state == :fleeing
        flee!(agent, model)
    end
    
    # Movement (unless resting or dead)
    if agent.behavior_state != :resting
        move_agent!(agent, model)
    end
    
    # Energy decay
    agent.energy -= model.properties[:base_energy_decay]
    
    # Disease transmission
    if agent.health_status == :infected
        transmit_disease!(agent, model)
    end
end

"""
Update agent health status based on disease model
"""
function update_health_status!(agent::EcosystemAgent, model::ABM)
    if agent.health_status == :infected
        agent.infection_duration += 1
        
        # Check for recovery
        if rand(model.rng) < agent.recovery_probability
            agent.health_status = :recovered
            agent.infection_duration = 0
        # Check for death from disease
        elseif rand(model.rng) < agent.death_probability
            agent.health_status = :dead
        end
    end
end

"""
Choose behavior based on agent state and environment
"""
function choose_behavior!(agent::EcosystemAgent, model::ABM)
    # Sick agents rest more
    if agent.health_status == :infected && rand(model.rng) < 0.7
        agent.behavior_state = :resting
        return
    end
    
    # Low energy agents prioritize foraging
    if agent.energy < 50.0
        agent.behavior_state = :foraging
        return
    end
    
    # High energy agents may reproduce
    if (agent.energy >= agent.reproduction_threshold && 
        model.properties[:current_step] - agent.last_reproduction_step > 10)
        agent.behavior_state = :reproducing
        return
    end
    
    # Check for threats (high density of infected agents)
    nearby_infected = count_nearby_infected(agent, model)
    if nearby_infected > 2
        agent.behavior_state = :fleeing
        return
    end
    
    # Default to foraging
    agent.behavior_state = :foraging
end

"""
Foraging behavior - look for resources
"""
function forage!(agent::EcosystemAgent, model::ABM)
    # Get resource value at current position
    x, y = agent.pos
    resource_value = model.properties[:resource_grid][x, y]
    
    if resource_value > 0.0
        # Consume resource
        energy_gained = resource_value * agent.resource_efficiency
        agent.energy += energy_gained
        
        # Reduce resource (with regeneration)
        model.properties[:resource_grid][x, y] *= 0.8
        
        # Produce waste
        waste_produced = energy_gained * agent.waste_production
        model.properties[:waste_grid][x, y] += waste_produced
    end
end

"""
Reproduction behavior
"""
function attempt_reproduction!(agent::EcosystemAgent, model::ABM)
    if (agent.energy >= agent.reproduction_threshold && 
        rand(model.rng) < agent.reproduction_probability)
        
        # Create offspring
        create_offspring!(agent, model)
        
        # Pay reproduction cost
        agent.energy -= agent.reproduction_cost
        agent.last_reproduction_step = model.properties[:current_step]
    end
end

"""
Create offspring with genetic variation
"""
function create_offspring!(parent::EcosystemAgent, model::ABM)
    # Find nearby empty positions
    possible_positions = nearby_positions(parent.pos, model)
    empty_positions = filter(pos -> length(agents_in_position(pos, model)) == 0, 
                           possible_positions)
    
    if !isempty(empty_positions)
        offspring_pos = rand(model.rng, empty_positions)
        
        # Genetic inheritance with mutation
        offspring_traits = copy(parent.traits)
        for (trait, value) in offspring_traits
            # Small random mutation
            mutation = randn(model.rng) * 0.1
            offspring_traits[trait] = clamp(value + mutation, 0.0, 1.0)
        end
        
        # Create offspring with inherited traits
        offspring = EcosystemAgent(
            nextid(model),
            offspring_pos,
            energy=parent.offspring_energy,
            traits=offspring_traits,
            speed=parent.speed * (0.9 + 0.2 * rand(model.rng)),
            reproduction_threshold=parent.reproduction_threshold * (0.9 + 0.2 * rand(model.rng)),
            recovery_probability=parent.recovery_probability * (0.9 + 0.2 * rand(model.rng))
        )
        
        add_agent!(offspring, model)
    end
end

"""
Resting behavior - recover energy slowly
"""
function rest!(agent::EcosystemAgent, model::ABM)
    # Recover small amount of energy
    agent.energy += model.properties[:rest_recovery_rate]
    
    # Reduced movement cost while resting
    agent.energy += agent.movement_cost * 0.5
end

"""
Fleeing behavior - move away from threats
"""
function flee!(agent::EcosystemAgent, model::ABM)
    # Find direction away from infected agents
    infected_positions = [a.pos for a in nearby_agents(agent, model, agent.perception_range) 
                         if a.health_status == :infected]
    
    if !isempty(infected_positions)
        # Calculate average threat position
        avg_threat_pos = mean(infected_positions)
        
        # Move in opposite direction
        current_pos = collect(agent.pos)
        threat_vector = current_pos .- avg_threat_pos
        
        # Normalize and scale
        if norm(threat_vector) > 0
            flee_direction = threat_vector ./ norm(threat_vector)
            target_pos = current_pos .+ flee_direction .* 2
            
            # Clamp to grid bounds
            grid_size = size(model.space)
            target_pos[1] = clamp(round(Int, target_pos[1]), 1, grid_size[1])
            target_pos[2] = clamp(round(Int, target_pos[2]), 1, grid_size[2])
            
            # Move towards target (if valid)
            move_agent!(agent, (target_pos[1], target_pos[2]), model)
        end
    end
end

"""
Move agent with energy cost
"""
function move_agent!(agent::EcosystemAgent, model::ABM)
    # Random walk with speed
    possible_moves = nearby_positions(agent.pos, model, floor(Int, agent.speed))
    if !isempty(possible_moves)
        new_pos = rand(model.rng, possible_moves)
        move_agent!(agent, new_pos, model)
        
        # Pay movement cost
        agent.energy -= agent.movement_cost
    end
end

"""
Disease transmission between nearby agents
"""
function transmit_disease!(agent::EcosystemAgent, model::ABM)
    nearby = nearby_agents(agent, model, 1)  # Adjacent agents only
    
    for neighbor in nearby
        if (neighbor.health_status == :susceptible && 
            rand(model.rng) < agent.transmission_probability)
            neighbor.health_status = :infected
            neighbor.infection_start_step = model.properties[:current_step]
        end
    end
end

"""
Count nearby infected agents
"""
function count_nearby_infected(agent::EcosystemAgent, model::ABM)
    return count(a -> a.health_status == :infected, 
                nearby_agents(agent, model, agent.perception_range))
end

"""
EcosystemModel for Agents.jl
Manages the environment and global simulation state
"""
function create_ecosystem_model(;
    grid_size::Tuple{Int,Int}=(50, 50),
    initial_population::Int=100,
    seed::Int=12345,
    base_energy_decay::Float64=0.5,
    resource_regeneration_rate::Float64=0.01,
    initial_infected_fraction::Float64=0.05,
    rest_recovery_rate::Float64=2.0)
    
    # Create space
    space = GridSpace(grid_size, periodic=false)
    
    # Create random number generator
    rng = Random.MersenneTwister(seed)
    
    # Initialize resource and waste grids
    resource_grid = rand(rng, grid_size...) .* 100.0
    waste_grid = zeros(Float64, grid_size...)
    
    # Model properties
    properties = Dict(
        :current_step => 0,
        :resource_grid => resource_grid,
        :waste_grid => waste_grid,
        :base_energy_decay => base_energy_decay,
        :resource_regeneration_rate => resource_regeneration_rate,
        :rest_recovery_rate => rest_recovery_rate,
        :total_births => 0,
        :total_deaths => 0,
        :total_infections => 0
    )
    
    # Create model
    model = ABM(EcosystemAgent, space; properties=properties, rng=rng)
    
    # Add initial population
    for i in 1:initial_population
        pos = (rand(rng, 1:grid_size[1]), rand(rng, 1:grid_size[2]))
        
        # Determine initial health status
        health_status = rand(rng) < initial_infected_fraction ? :infected : :susceptible
        
        agent = EcosystemAgent(i, pos, health_status=health_status)
        add_agent!(agent, model)
    end
    
    return model
end

"""
Model step function - called once per simulation step
"""
function model_step!(model::ABM)
    # Increment step counter
    model.properties[:current_step] += 1
    
    # Resource regeneration
    regenerate_resources!(model)
    
    # Waste decay
    decay_waste!(model)
    
    # Update statistics
    update_statistics!(model)
end

"""
Regenerate resources in the environment
"""
function regenerate_resources!(model::ABM)
    rate = model.properties[:resource_regeneration_rate]
    for i in eachindex(model.properties[:resource_grid])
        current = model.properties[:resource_grid][i]
        # Regenerate towards carrying capacity (100.0)
        if current < 100.0
            model.properties[:resource_grid][i] = min(100.0, current + rate * (100.0 - current))
        end
    end
end

"""
Decay waste in the environment
"""
function decay_waste!(model::ABM)
    # Waste naturally decays over time
    model.properties[:waste_grid] .*= 0.95
end

"""
Update simulation statistics
"""
function update_statistics!(model::ABM)
    agents_list = allagents(model)
    
    # Count health statuses
    susceptible = count(a -> a.health_status == :susceptible, agents_list)
    infected = count(a -> a.health_status == :infected, agents_list)
    recovered = count(a -> a.health_status == :recovered, agents_list)
    
    # Store in properties for access
    model.properties[:susceptible_count] = susceptible
    model.properties[:infected_count] = infected
    model.properties[:recovered_count] = recovered
    model.properties[:total_population] = length(agents_list)
end

"""
AgentsEngine - Main engine interface for Genesis integration
"""
mutable struct AgentsEngine
    config::Dict
    model::Union{Nothing, ABM}
    step::Int
    
    AgentsEngine(config::Dict) = new(config, nothing, 0)
end

"""
Initialize the simulation
"""
function initialize_simulation(engine::AgentsEngine, master_seed::Int64)
    config = engine.config
    
    # Extract configuration parameters using Genesis schema
    simulation = get(config, "simulation", Dict())
    grid_width = get(simulation, "worldSize", 50)
    grid_height = grid_width  # Square grid
    initial_population = get(simulation, "populationSize", 100)
    enable_disease = get(simulation, "enableDisease", true)
    
    # Disease parameters
    disease_config = get(config, "disease", Dict())
    initial_infected_fraction = get(disease_config, "initialInfectionRate", 0.05)
    
    # RNG config
    rng_config = get(config, "rng", Dict())
    seed_str = get(rng_config, "masterSeed", string(master_seed))
    seed = parse(Int64, seed_str)
    
    # Create model
    engine.model = create_ecosystem_model(
        grid_size=(grid_width, grid_height),
        initial_population=initial_population,
        seed=seed,
        initial_infected_fraction=initial_infected_fraction
    )
    
    engine.step = 0
end

"""
Step the simulation forward
"""
function step_simulation!(engine::AgentsEngine)
    if engine.model === nothing
        throw(ArgumentError("Model not initialized"))
    end
    
    # Step all agents, then step model
    step!(engine.model, agent_step!, model_step!)
    engine.step += 1
end

"""
Create deterministic snapshot conforming to Genesis schema
"""
function create_snapshot(engine::AgentsEngine, kind::String="metrics")
    if engine.model === nothing
        throw(ArgumentError("Model not initialized"))
    end
    
    # Collect agent data in deterministic order (by ID)
    agents_list = collect(allagents(engine.model))
    sort!(agents_list, by=a -> a.id)
    
    # Calculate metrics
    metrics = calculate_metrics(engine.model, agents_list)
    
    # Create snapshot according to Genesis schema
    snapshot = Dict(
        "schema" => "GENX_SNAP_V1",
        "timeModel" => "TIME_V1",
        "tick" => engine.step,
        "buildHash" => "agents-jl-v1.0.0",
        "rngDigest" => create_rng_digest(engine.model),
        "simDigest" => create_sim_digest(engine.model, agents_list),
        "metrics" => metrics,
        "provider" => Dict(
            "name" => "agentsjl",
            "version" => string(Agents.version),
            "license" => "MIT",
            "buildHash" => "agents-jl-v1.0.0"
        )
    )
    
    # Add full state for "full" snapshots
    if kind == "full"
        snapshot["state"] = Dict(
            "agents" => serialize_agents(agents_list),
            "environment" => serialize_environment(engine.model)
        )
    end
    
    return snapshot
end

"""
Calculate simulation metrics conforming to Genesis schema
"""
function calculate_metrics(model::ABM, agents_list::Vector)
    # SIR counts
    susceptible = count(a -> a.health_status == :susceptible, agents_list)
    infected = count(a -> a.health_status == :infected, agents_list)
    recovered = count(a -> a.health_status == :recovered, agents_list)
    
    # Energy statistics
    energies = [a.energy for a in agents_list]
    energy_mean = length(energies) > 0 ? mean(energies) : 0.0
    
    # Population density
    grid_size = size(model.space)
    area = grid_size[1] * grid_size[2]
    density = length(agents_list) / area
    
    return Dict(
        "pop" => length(agents_list),
        "energyMean" => energy_mean,
        "sir" => Dict(
            "S" => susceptible,
            "I" => infected,
            "R" => recovered
        ),
        "spatial" => Dict(
            "density" => density,
            "clustering" => 0.0  # Placeholder for clustering calculation
        )
    )
end

"""
Serialize agents to Genesis schema format
"""
function serialize_agents(agents_list::Vector)
    agent_states = []
    
    for agent in agents_list
        # Map health status to SIR state
        sir_state = if agent.health_status == :susceptible
            0
        elseif agent.health_status == :infected
            1
        else  # recovered or dead
            2
        end
        
        agent_state = Dict(
            "id" => string(agent.id),
            "position" => Dict("x" => agent.pos[1], "y" => agent.pos[2]),
            "velocity" => Dict("dx" => 0.0, "dy" => 0.0),  # Agents.jl doesn't track velocity
            "energy" => agent.energy,
            "sirState" => sir_state,
            "daysInState" => agent.infection_duration,
            "ageTicks" => agent.age
        )
        
        push!(agent_states, agent_state)
    end
    
    return agent_states
end

"""
Serialize environment to Genesis schema format
"""
function serialize_environment(model::ABM)
    # Flatten resource grid to Float32Array format
    resource_grid = vec(Float32.(model.properties[:resource_grid]))
    
    return Dict(
        "resourceGrid" => resource_grid,
        "tick" => model.properties[:current_step],
        "weather" => Dict(
            "temperature" => 20.0,
            "humidity" => 0.5,
            "windSpeed" => 0.0
        )
    )
end

"""
Create RNG digest for deterministic verification
"""
function create_rng_digest(model::ABM)
    # Get RNG state and hash it
    rng_state = string(model.rng.seed)
    hash_bytes = sha256(Vector{UInt8}(rng_state))
    return bytes2hex(hash_bytes)
end

"""
Create simulation state digest for deterministic verification
"""
function create_sim_digest(model::ABM, agents_list::Vector)
    # Create deterministic representation of simulation state
    state_data = []
    
    # Agent data (sorted by ID)
    for agent in agents_list
        push!(state_data, [
            agent.id,
            agent.pos[1], agent.pos[2],
            agent.energy,
            Int(agent.health_status == :susceptible ? 0 : 
                agent.health_status == :infected ? 1 : 2),
            agent.age
        ])
    end
    
    # Environment data
    resource_sum = sum(model.properties[:resource_grid])
    push!(state_data, ["ENV", resource_sum, model.properties[:current_step]])
    
    # Convert to JSON and hash
    state_json = JSON3.write(state_data)
    hash_bytes = sha256(Vector{UInt8}(state_json))
    return bytes2hex(hash_bytes)
end

"""
Cleanup simulation resources
"""
function cleanup_simulation(engine::AgentsEngine)
    engine.model = nothing
    engine.step = 0
end