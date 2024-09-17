import { CacheInfo } from "@libs/common";
import { CacheService } from "@multiversx/sdk-nestjs-cache";
import { Injectable } from "@nestjs/common";
import BigNumber from "bignumber.js";
import axios from 'axios';
import moment from "moment";
import { AppConfigService } from "apps/api/src/config/app-config.service";
import { OriginLogger } from "@multiversx/sdk-nestjs-common";

interface TokenPrice {
    name: string;
    identifier: string,
    price: BigNumber,
    date: moment.Moment
}

@Injectable()
export class DataService {
    private readonly logger = new OriginLogger(DataService.name);

    constructor(
        private readonly cachingService: CacheService,
        private readonly appConfigService: AppConfigService,
    ) { }

    async getTokenPrice(tokenId: string, date: moment.Moment): Promise<BigNumber> {
        return await this.cachingService.getOrSet(
            CacheInfo.TokenPrice(tokenId, date).key,
            async () => await this.getTokenPriceRaw(tokenId, date),
            CacheInfo.TokenPrice(tokenId, date).ttl
        );
    }

    async getTokenPriceRaw(tokenId: string, date: moment.Moment): Promise<BigNumber> {
        try {
            if (tokenId.startsWith('USD')) {
                return (await axios.get<TokenPrice>(`${this.appConfigService.getDataApiCexUrl()}/${tokenId}?date=${date.format('YYYY-MM-DD')}`)).data.price;
            }
            return (await axios.get<TokenPrice>(`${this.appConfigService.getDataApiXexchangeUrl()}/${tokenId}?date=${date.format('YYYY-MM-DD')}`)).data.price;
        }
        catch (error) {
            this.logger.error(error);
            return new BigNumber(0);
        }
    }

    async getTokenPrecision(tokenId: string): Promise<number> {
        return await this.cachingService.getOrSet(
            CacheInfo.TokenPrecision(tokenId).key,
            async () => await this.getTokenPrecisionRaw(tokenId),
            CacheInfo.TokenPrecision(tokenId).ttl
        );
    }

    async getTokenPrecisionRaw(tokenId: string): Promise<number> {
        try {
            const precision = (await axios.get(`${this.appConfigService.getApiUrl()}/tokens/${tokenId}?fields=decimals`)).data.decimals;
            return precision;
        } catch (error) {
            this.logger.error(error);
            return 18;
        }
    }
}
