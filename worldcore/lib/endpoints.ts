export interface Endpoint {
  label: string;
  description: string;
  url: string;
  local: boolean;
}

export const ENDPOINTS: Endpoint[] = [
  {
    label: "Local",
    description: "Connect directly to a local runtime",
    url: "http://localhost:8080",
    local: true,
  },
  {
    label: "Dev",
    description: "Reactor dev environment (api.rea.live)",
    url: "https://api.rea.live",
    local: false,
  },
  {
    label: "Production",
    description: "Reactor production environment (api.reactor.inc)",
    url: "https://api.reactor.inc",
    local: false,
  },
];
