import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://53c7dd3ba06c7d6b4e16d21ad77f6b5e@o4511161026740224.ingest.us.sentry.io/4511161061146624",
  tracesSampleRate: 0.1,
});
