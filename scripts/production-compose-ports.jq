[.services | to_entries[] | select(.value.ports) |
  {service: .key, ports: .value.ports[]}] as $published |
([$published[] | select(.service == "caddy") | .ports.target] | sort) == [80, 443, 443]
and all($published[] | select(.service != "caddy"); .ports.host_ip == "127.0.0.1")
