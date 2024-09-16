import { Injectable } from "@nestjs/common";
import { EventLog } from "apps/api/src/endpoints/events/entities";
import { Address } from "@multiversx/sdk-core";
import BigNumber from "bignumber.js";
import { CsvRecordsService } from "../records";
import moment from "moment";
import { DataService } from "../data";
import { CSVHeaders } from "@libs/entities";

interface BorrowEvent {
    eventName: string;
    borrowerAddress: string;
    amount: BigNumber;
    newAccountBorrow: BigNumber;
    newTotalBorrows: BigNumber;
    newBorrowerIndex: BigNumber;
}

@Injectable()
export class HatomEventsService {
    private readonly headers: CSVHeaders[] = [
        { name: 'borrowerAddress', type: 'varchar' },
        { name: 'timestamp', type: 'varchar' },
        { name: 'borrowedAmount', type: 'double' },
        { name: 'borrowedAmountInEGLD', type: 'double' },
        { name: 'borrowedAmountInUSD', type: 'double' },
        { name: 'totalBorrowed', type: 'double' },
        { name: 'accountBorrowed', type: 'double' },
        { name: 'borrowedToken', type: 'varchar' }
    ];
    constructor(
        private readonly csvRecordsService: CsvRecordsService,
        private readonly dataService: DataService,
    ) { }

    public async hatomWebhook(eventsLog: EventLog[], borrowedToken: string): Promise<void> {

        for (const eventLog of eventsLog) {
            const borrowEventInHex = '626f72726f775f6576656e74';

            if (eventLog.identifier === "borrow" && eventLog.topics[0] === borrowEventInHex) {
                const currentEvent = this.decodeTopics(eventLog);
                const eventDate = moment.unix(eventLog.timestamp);

                const [borrowedAmountInEGLD, borrowedAmountInUSD] = await this.convertBorrowedAmount(currentEvent, borrowedToken, eventDate);
                const tokenPrecision = await this.dataService.getTokenPrecision(borrowedToken);

                await this.csvRecordsService.pushRecord(`hatomEvents`,
                    [`${currentEvent.borrowerAddress},${eventDate.format('YYYY-MM-DD HH:mm:ss.SSS')},${currentEvent.amount.shiftedBy(-tokenPrecision).decimalPlaces(4)},${borrowedAmountInEGLD.shiftedBy(-tokenPrecision).decimalPlaces(4)},${borrowedAmountInUSD.shiftedBy(-tokenPrecision).decimalPlaces(4)},${currentEvent.newTotalBorrows.shiftedBy(-tokenPrecision).decimalPlaces(4)},${currentEvent.newAccountBorrow.shiftedBy(-tokenPrecision).decimalPlaces(4)},${borrowedToken}`],
                    this.headers);
            }
        }
    }

    decodeTopics(eventLog: EventLog): BorrowEvent {
        const currentEvent: BorrowEvent = {
            eventName: Buffer.from(eventLog.topics[0], 'hex').toString(),
            borrowerAddress: Address.newFromHex(Buffer.from(eventLog.topics[1], 'hex').toString('hex')).toBech32(),
            amount: BigNumber(Buffer.from(eventLog.topics[2], 'hex').toString('hex'), 16),
            newAccountBorrow: BigNumber(Buffer.from(eventLog.topics[3], 'hex').toString('hex'), 16),
            newTotalBorrows: BigNumber(Buffer.from(eventLog.topics[4], 'hex').toString('hex'), 16),
            newBorrowerIndex: BigNumber(Buffer.from(eventLog.topics[5], 'hex').toString('hex'), 16),
        };

        return currentEvent;
    }

    async convertBorrowedAmount(currentEvent: BorrowEvent, borrowedToken: string, date: moment.Moment): Promise<[BigNumber, BigNumber]> {
        let borrowedAmountInEGLD, borrowedAmountInUSD;

        const egldPrice = await this.dataService.getTokenPrice('WEGLD-bd4d79', date);
        if (borrowedToken === 'WEGLD-bd4d79') {
            borrowedAmountInEGLD = currentEvent.amount;
            borrowedAmountInUSD = borrowedAmountInEGLD.multipliedBy(egldPrice);
        } else {
            borrowedAmountInUSD = currentEvent.amount;
            borrowedAmountInEGLD = borrowedAmountInUSD.dividedBy(egldPrice);
        }
        return [borrowedAmountInEGLD, borrowedAmountInUSD];
    }
}


