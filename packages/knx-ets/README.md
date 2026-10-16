# KNX ETS

Headless ETS/KNXPROJ source adapter and parser core.

## Responsibilities
- discover/read KNXPROJ archive structure through archive ports
- parse project/master/hardware data without JSZip dependency
- navigate XML through an injected XML runtime, without public DOM types
- preserve ETS source evidence in serializable `EtsSourceProject`
- lazily resolve ApplicationProgram definitions for device details
- map ETS source data into the source-independent `KnxProjectModel`

## Runtime model
```text
Archive adapter -> EtsArchiveSource -> openEtsProject(...)
XML adapter ----------------------^        |
                                          +-> materialize()
                                          +-> loadDeviceDetails(id)
```

`materialize()` intentionally does not read ApplicationProgram XML. Detailed KO semantics are lazy. Use `hydrateEtsProjectDetails()` when a consumer needs all device details.

## Forbidden
- React/UI state
- direct JSZip dependency
- public DOM/Document/Element types
- Home Assistant entity logic
- application-specific workflow state
