// Comprueba resolución real desde ambos consumidores sin editar sus archivos.
const path = require('node:path');
const { createRequire } = require('node:module');
const repoRoot = path.resolve(__dirname, '../../..');
let failed = false;

for (const appName of ['cgbg-admin', 'cgbg-client']) {
  const appRoot = path.join(repoRoot, 'apps', appName);
  const appRequire = createRequire(path.join(appRoot, 'package.json'));
  const ts = appRequire('typescript');
  const configPath = path.join(appRoot, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, appRoot);
  const options = {
    ...parsed.options, noEmit: true, incremental: false, composite: false,
    // Solo se comprueba el contrato, sin cargar los ambientes de Angular/React.
    types: [],
  };
  const sourcePath = path.join(appRoot, '__shared_contract_consumer__.ts');
  const sourceText = `import type {
    CustomerDto, CustomerDetail, CreateCustomerRequest, AppointmentDto,
    CreateAppointmentRequest, CreatePublicAppointmentRequest,
    RescheduleAppointmentRequest, AvailabilityRequest, AvailabilityResponse,
    BranchDto, PublicAppointmentResponse, ApiErrorResponse, PublicTenantDto, PublicServiceDto,
  } from '@cgbg/shared-types';
  export type ConsumerContract = [
    CustomerDto, CustomerDetail, CreateCustomerRequest, AppointmentDto,
    CreateAppointmentRequest, CreatePublicAppointmentRequest,
    RescheduleAppointmentRequest, AvailabilityRequest, AvailabilityResponse,
    BranchDto, PublicAppointmentResponse, ApiErrorResponse, PublicTenantDto, PublicServiceDto,
  ];`;
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    path.resolve(fileName) === sourcePath
      ? ts.createSourceFile(fileName, sourceText, languageVersion, true)
      : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram([sourcePath], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    failed = true;
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => repoRoot,
      getNewLine: () => '\n',
    }));
  } else {
    console.log(`${appName}: import type desde @cgbg/shared-types compila (TypeScript ${ts.version}).`);
  }
}
process.exitCode = failed ? 1 : 0;
