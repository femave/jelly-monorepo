import algosdk from 'algosdk';
import { HTLC_TEMPLATE } from 'algosdk/src/logicTemplates/htlc';

import { AlgorandProvider, AlgorandWallet } from '@jelly-swap/types';
import { sha256 } from '@jelly-swap/utils';

import Config from '../config';
import { fundHTLCContract, formatNote } from './utils';
import { RefundEvent } from '../types';

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';

export default class HTLC {
    private config: any;
    private wallet: AlgorandWallet;
    private provider: AlgorandProvider;

    constructor(wallet: any, config = Config()) {
        this.config = config;
        this.wallet = wallet;
        this.provider = wallet.provider;
    }

    public async newSwap(
        value: number,
        recipientAddress: string,
        refundAddress: string,
        hashLock: string,
        expiration: number = this.config.expiration,
        metadata: any
    ) {
        try {
            const params = await this.provider.getTransactionParams();
            const hashFn = 'sha256';
            const htlc = new HTLC_TEMPLATE.HTLC(
                refundAddress,
                recipientAddress,
                hashFn,
                hashLock,
                expiration,
                this.config.maxFee
            );

            return fundHTLCContract(params, htlc, this.wallet, value, this.provider, metadata);
        } catch (error) {
            throw error;
        }
    }

    public async withdraw(
        recipientAddress: string,
        refundAddress: string,
        expiration: number,
        secret: string,
        metadata: any,
        secretHash?: any
    ) {
        try {
            const params = await this.provider.getTransactionParams();
            const hashFn = 'sha256';
            if (!secretHash) {
                secretHash = sha256(secret);
            }

            const htlc = new HTLC_TEMPLATE.HTLC(
                refundAddress,
                recipientAddress,
                hashFn,
                secretHash,
                expiration,
                this.config.maxFee
            );

            const txn = {
                from: htlc.getAddress(),
                to: ZERO_ADDRESS,
                fee: 1,
                type: 'pay',
                amount: 0,
                firstRound: params.firstRound,
                lastRound: params.lastRound,
                genesisID: params.genesisID,
                genesisHash: params.genesisHash,
                closeRemainderTo: recipientAddress,
                note: formatNote(metadata),
            };
            const lsig = algosdk.makeLogicSig(htlc.getProgram(), [secret]);
            const rawSignedTxn = algosdk.signLogicSigTransaction(txn, lsig);

            let tx = await this.provider.sendRawTransaction(rawSignedTxn.blob, metadata);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    async refund(
        recipientAddress: string,
        refundAddress: string,
        expiration: number,
        secretHash: any,
        metadata: RefundEvent
    ) {
        try {
            const params = await this.provider.getTransactionParams();
            const hashFn = 'sha256';

            const htlc = new HTLC_TEMPLATE.HTLC(
                refundAddress,
                recipientAddress,
                hashFn,
                secretHash,
                expiration,
                this.config.maxFee
            );

            const txn = {
                from: htlc.getAddress(),
                to: ZERO_ADDRESS,
                fee: 1,
                type: 'pay',
                amount: 0,
                firstRound: params.firstRound,
                lastRound: params.lastRound,
                genesisID: params.genesisID,
                genesisHash: params.genesisHash,
                closeRemainderTo: refundAddress,
                note: formatNote(metadata),
            };
            const lsig = algosdk.makeLogicSig(htlc.getProgram(), ['refund']);
            const rawSignedTxn = algosdk.signLogicSigTransaction(txn, lsig);

            let tx = await this.provider.sendRawTransaction(rawSignedTxn.blob, metadata);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    async getCurrentBlock(): Promise<string | number> {
        return await this.provider.getCurrentBlock();
    }

    async getBalance(address: string): Promise<string | number> {
        return await this.provider.getBalance(address);
    }
}
