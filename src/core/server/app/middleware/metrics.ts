import onFinished from "on-finished";
import { container } from "tsyringe";

import { createTimer } from "coral-server/helpers";
import { MetricsService } from "coral-server/services/metrics";
import { RequestHandler } from "coral-server/types/express";

export const metricsRecorder = (): RequestHandler => {
  const metrics = container.resolve(MetricsService);

  const { httpRequestsTotal, httpRequestDurationMilliseconds } = metrics;

  return (req, res, next) => {
    const timer = createTimer();
    onFinished(res, () => {
      // Compute the end time.
      const responseTime = timer();

      // Increment the request counter.
      httpRequestsTotal.labels(`${res.statusCode}`, req.method).inc();

      // Only compute the request path when status code isn't 404 to avoid flood
      if (res.statusCode !== 404) {
        // Add the request duration.
        httpRequestDurationMilliseconds
          .labels(req.method, req.baseUrl + req.path)
          .observe(responseTime);
      }
    });
    next();
  };
};
