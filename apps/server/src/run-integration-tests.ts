import { runShootEventsIntegrationSuite } from "./events/shootEvents.integration.spec.js";
import { runStartGameIntegrationSuite } from "./events/startGame.integration.spec.js";

async function run(): Promise<void> {
  await runStartGameIntegrationSuite();
  await runShootEventsIntegrationSuite();
}

run()
  .then(() => {
    console.log("apps/server integration tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
