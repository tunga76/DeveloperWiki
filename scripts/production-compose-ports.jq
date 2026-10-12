[.services | to_entries[] | select(.value.ports) |
  {service: .key, ports: .value.ports[]}] as $published |
([ $published[] | select(.service == "caddy") |
  "\(.ports.target):\(.ports.published):\(.ports.protocol)" ] | sort) ==
  ["443:443:tcp", "443:443:udp", "80:80:tcp"]
and all($published[] | select(.service != "caddy"); .ports.host_ip == "127.0.0.1")
