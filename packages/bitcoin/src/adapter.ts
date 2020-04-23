import { generateHashLock, getExpiration, sha256 } from '@jelly-swap/utils';
import BigNumber from 'bignumber.js';

import { JellyAdapter, ContractSwap, UserInputSwap } from './types';
import Config from './config';

export default class BitcoinAdapter implements JellyAdapter {
    private config: any;

    constructor(config = Config()) {
        this.config = config;
    }

    createSwapFromInput(inputSwap: ContractSwap, sender = this.config.receiverAddress): ContractSwap {
        const expiration = getExpiration(this.config.expiration, 'second', this.config.unix);

        const result = {
            network: inputSwap.outputNetwork,
            outputAmount: inputSwap.inputAmount,
            expiration,
            hashLock: inputSwap.hashLock,
            sender,
            receiver: inputSwap.outputAddress,
            refundAddress: sender,
            outputNetwork: inputSwap.network,
            outputAddress: inputSwap.receiver,
            inputAmount: Number(inputSwap.outputAmount),
        };

        const id = this.generateId(result);

        return { ...result, id };
    }

    addressValid = (_address: string): boolean => {
        return true;
    };

    parseAddress = (address: string): string => {
        return address;
    };

    parseOutputAddress = (address: string): string => {
        return address;
    };

    parseToNative(amount: string | number): string | number {
        return new BigNumber(amount).multipliedBy(new BigNumber(10).exponentiatedBy(8)).toString();
    }

    parseFromNative(amount: string): string | number {
        return new BigNumber(amount).dividedBy(new BigNumber(10).exponentiatedBy(8)).toString();
    }

    formatInput(data: UserInputSwap, receiver = this.config.receiverAddress): ContractSwap {
        const inputAmount = this.parseToNative(data.inputAmount);
        const hashLock = generateHashLock(data.secret);

        const expiration = getExpiration(this.config.expiration, 'second', this.config.unix);

        return {
            ...data,
            inputAmount,
            hashLock,
            receiver,
            network: 'BTC',
            expiration,
        };
    }

    generateId(swap: ContractSwap): string {
        const idData = JSON.stringify({
            sender: swap.sender,
            receiver: swap.receiver,
            inputAmount: swap.inputAmount,
            hashLock: swap.hashLock,
            expiration: swap.expiration,
        });
        return '0x' + sha256(idData).toString('hex');
    }
}
