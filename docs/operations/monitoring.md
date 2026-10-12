# Monitoring and alert thresholds

Prometheus scrapes the API every 15 seconds. `infrastructure/monitoring/alerts.yml` contains the initial thresholds, and the provisioned Grafana dashboard shows API availability, target state, 5xx share, and mean request latency.

| Alert                  | Threshold                                                             |       Wait | Severity |
| ---------------------- | --------------------------------------------------------------------- | ---------: | -------- |
| API scrape unavailable | API target is down                                                    |  2 minutes | critical |
| High server error rate | At least 5 server errors and more than 5% of requests over 10 minutes |  5 minutes | warning  |
| High mean latency      | More than 2 seconds with at least 0.1 requests/second                 | 10 minutes | warning  |

These are starting values. Review them against staging traffic before treating them as SLOs. The latency summary is a mean, not a percentile; API instrumentation does not currently expose histogram buckets.

Prometheus alert rules create firing/pending state in Prometheus. The optional `compose.alertmanager.yaml` overlay enables Alertmanager routing; `alertmanager.yml.example` is only a reserved `.invalid` placeholder and must be replaced with an approved receiver config before enabling it. Operators must select and configure an approved incident channel, verify delivery, and assign an on-call owner before release. The production Compose layer keeps Grafana and Prometheus off public host ports; provide access through the organization's protected operations network or a controlled SSH tunnel.

## Protected operations access

Set `ENABLE_OPS_UI=true` in the deployment env file and start the stack with `compose.ops-access.yaml` as the final Compose file. It binds Grafana to host loopback port 3002 and Prometheus to loopback port 9090, while keeping them off the public interface. From an authorized workstation, forward those ports over SSH:

```sh
ssh -N -L 3002:127.0.0.1:3002 -L 9090:127.0.0.1:9090 deploy-user@your-host
```

Open Grafana at `http://127.0.0.1:3002` and Prometheus at `http://127.0.0.1:9090`. Keep Grafana authentication enabled and restrict host SSH access to operators.

## Optional notification delivery

`infrastructure/monitoring/alertmanager.yml.example` is a generic webhook receiver example using the reserved `.invalid` domain. Do not deploy it unchanged. Copy it to a protected host path, replace the URL with the approved receiver, then set `ENABLE_ALERTMANAGER=true`, `ALERTMANAGER_IMAGE` to a digest-pinned image, and `ALERTMANAGER_CONFIG_FILE` to that protected config file. The optional `compose.alertmanager.yaml` layer connects Prometheus to Alertmanager. Run `scripts/validate-production-config.sh` before applying the overlay and verify delivery with the incident-channel owner before release.

CI runs `promtool check config` against the Prometheus configuration, which also checks the referenced alert rules.
