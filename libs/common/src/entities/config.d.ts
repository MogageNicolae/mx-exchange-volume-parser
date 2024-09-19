/* Autogenerated code */

export interface Config {
  apps: {
    api: {
      port: number;
      privatePort: number;
      useCachingInterceptor: boolean;
    };
    duneSimulator: {
      port: number;
      privatePort: number;
      useCachingInterceptor: boolean;
    };
  };
  libs: {
    common: {
      network: "devnet" | "testnet" | "mainnet";
      urls: {
        api: string;
        dataApiCex: string;
        dataApiXexchange: string;
        dataApiHatom: string;
        duneApi: string;
      };
      database: {
        host: string;
        port: number;
        username?: string;
        password?: string;
        name: string;
        tlsAllowInvalidCertificates: boolean;
      };
      redis: {
        host: string;
        port: number;
      };
      features: {
        dune: {
          namespace: string;
          apiKey: string;
        };
      };
      nativeAuth: {
        maxExpirySeconds: number;
        acceptedOrigins: string[];
      };
      security: {
        admins: string[];
      };
      rateLimiterSecret?: string;
    };
  };
}
