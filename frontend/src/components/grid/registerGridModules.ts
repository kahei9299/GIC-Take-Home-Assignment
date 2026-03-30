import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";

// AG Grid v33+ requires explicit module registration even for simple community
// features. Register once at bootstrap and in the test setup.
ModuleRegistry.registerModules([AllCommunityModule]);
