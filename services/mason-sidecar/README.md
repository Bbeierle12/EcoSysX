# Genesis Engine MASON Sidecar

JSON-RPC sidecar service for running MASON ecosystem simulations.

## Dependencies

- Java 11+
- MASON 20+
- Maven 3.6+
- Gson for JSON processing

## Building

```bash
mvn clean package
```

## Usage

```bash
java -jar target/mason-sidecar-1.0.0-jar-with-dependencies.jar
```

Communicates via JSON-RPC over stdin/stdout with the Genesis Engine.

## Docker Build

```bash
docker build -t genx-mason-sidecar .
```