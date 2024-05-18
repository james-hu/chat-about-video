export function fixClient(openAIClient: any) {
  // Fix the object sent to: context.path("/deployments/{deploymentId}/chat/completions", deploymentId).post(...)
  openAIClient._client = new Proxy(openAIClient._client, {
    get(target, property) {
      if (property === 'path') {
        return function (...args: any[]) {
          const pathReturnValue = target.path(...args);
          return new Proxy(pathReturnValue, {
            get(target, property) {
              if (property === 'post') {
                return function (...args: any[]) {
                  const body = args[0]?.body;
                  console.log(body);
                  if (body && Array.isArray(body.data_sources) && body.data_sources?.[0]?.type === 'AzureComputerVisionVideoIndex' && body.enhancements?.video?.enabled !== true) {
                    body.enhancements = {
                      video: {
                        enabled: true,
                      },
                    };
                  }
                  console.log(JSON.stringify(body, null, 2));
                  return target.post(...args);
                };
              }
              return target[property];
            },
          });
        };
      }
      return target[property];
    },
  });
}
