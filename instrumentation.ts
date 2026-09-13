import { logger } from "@/lib/loggerSystem";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logger.success("server", "ScripticX instrumentation ready", { environment: process.env.NODE_ENV });
  }
}
