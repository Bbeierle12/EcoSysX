using JSON3
using Agents
using Random
using SHA
using Distributions
using LinearAlgebra

# Include the engine implementation
include("engine_agents.jl")

"""
Agents.jl sidecar for Genesis Engine
Handles JSON-RPC communication over stdin/stdout
"""
mutable struct AgentsSidecar
    engine::Union{Nothing, AgentsEngine}
    
    AgentsSidecar() = new(nothing)
end

"""
Handle JSON-RPC request and return response
"""
function handle_request(sidecar::AgentsSidecar, request::Dict)
    op = get(request, "op", "")
    id = get(request, "id", nothing)
    
    try
        if op == "init"
            result = handle_init(sidecar, request)
            return Dict("ok" => true, "id" => id)
        elseif op == "step"
            result = handle_step(sidecar, request)
            return Dict("ok" => true, "tick" => result, "id" => id)
        elseif op == "snapshot"
            result = handle_snapshot(sidecar, request)
            return Dict("ok" => true, "snapshot" => result, "id" => id)
        elseif op == "stop"
            handle_stop(sidecar, request)
            return Dict("ok" => true, "id" => id)
        elseif op == "info"
            result = handle_info(sidecar, request)
            return Dict("ok" => true, "provider" => result, "id" => id)
        else
            return Dict("ok" => false, "error" => "Unknown operation: $op", "id" => id)
        end
    catch e
        return Dict("ok" => false, "error" => string(e), "id" => id)
    end
end

"""
Initialize the simulation engine
"""
function handle_init(sidecar::AgentsSidecar, request::Dict)
    cfg = request["cfg"]
    seed_str = get(request, "seed", "12345")
    master_seed = parse(Int64, seed_str)
    
    # Set global random seed
    Random.seed!(master_seed)
    
    # Create and initialize engine
    sidecar.engine = AgentsEngine(cfg)
    initialize_simulation(sidecar.engine, master_seed)
    
    return true
end

"""
Step the simulation forward
"""
function handle_step(sidecar::AgentsSidecar, request::Dict)
    if sidecar.engine === nothing
        throw(ArgumentError("Engine not initialized"))
    end
    
    n = get(request, "n", 1)
    
    for _ in 1:n
        step_simulation!(sidecar.engine)
    end
    
    return sidecar.engine.step
end

"""
Create deterministic snapshot
"""
function handle_snapshot(sidecar::AgentsSidecar, request::Dict)
    if sidecar.engine === nothing
        throw(ArgumentError("Engine not initialized"))
    end
    
    kind = get(request, "kind", "metrics")
    return create_snapshot(sidecar.engine, kind)
end

"""
Stop the simulation
"""
function handle_stop(sidecar::AgentsSidecar, request::Dict)
    if sidecar.engine !== nothing
        cleanup_simulation(sidecar.engine)
        sidecar.engine = nothing
    end
    return true
end

"""
Get engine information
"""
function handle_info(sidecar::AgentsSidecar, request::Dict)
    return Dict(
        "name" => "agentsjl",
        "version" => string(Agents.version),
        "license" => "MIT",
        "buildHash" => "agents-jl-v1.0.0"
    )
end

"""
Main event loop
"""
function main()
    sidecar = AgentsSidecar()
    
    # Ensure deterministic behavior
    Random.seed!(12345)
    
    try
        while !eof(stdin)
            line = readline(stdin)
            if isempty(strip(line))
                continue
            end
            
            try
                request = JSON3.read(line)
                response = handle_request(sidecar, request)
                response_json = JSON3.write(response)
                println(response_json)
                flush(stdout)
            catch e
                # Send error response
                error_response = Dict(
                    "ok" => false,
                    "error" => string(e),
                    "id" => nothing
                )
                error_json = JSON3.write(error_response)
                println(error_json)
                flush(stdout)
            end
        end
    catch InterruptException
        # Clean shutdown
        if sidecar.engine !== nothing
            cleanup_simulation(sidecar.engine)
        end
    end
end

# Run main if this is the entry point
if abspath(PROGRAM_FILE) == @__FILE__
    main()
end