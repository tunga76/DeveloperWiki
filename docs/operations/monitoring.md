# Monitoring and alert thresholds

Prometheus scrapes the API every 15 seconds. `infrastructure/monitoring/alerts.yml` contains the initial thresholds, and the provisioned Grafana dashboard shows API availability, target state, 5xx share, and mean request latency.

| Alert                  | Threshold                                                             |       Wait | Severity |
| ---------------------- | --------------------------------------------------------------------- | ---------: | -------- |
| API scrape unavailable | API target is down                                                    |  2 minutes | critical |
| High server error rate | At least 5 server errors and more than 5% of requests over 10 minutes |  5 minutes | warning  |
| High mean latency      | More than 2 seconds with at least 0.1 requests/second                 | 10 minutes | warning  |

These are starting values. Review them against staging traffic before treating them as SLOs. The latency summary is a mean, not a percentile; API instrumentation does not currently expose histogram buckets.

Prometheus alert rules create firing/pending state in Prometheus, but this repository does not configure Alertmanager or an external notification receiver. Operators must select and configure an approved incident channel and assign an on-call owner before release. The production Compose layer keeps Grafana and Prometheus off public host ports; provide access through the organization's protected operations network or a controlled SSH tunnel.

CI runs `promtool check config` against the Prometheus configuration, which also checks the referenced alert rules.
