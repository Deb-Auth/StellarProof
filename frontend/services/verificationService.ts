import { 
  Server, 
  TransactionBuilder, 
  Networks, 
  Contract,
  Address,
  BASE_FEE,
  xdr,
  Transaction,
  Memo,
  Hash
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { walletService } from './wallet';

export interface SubmissionResult {
  txHash: string;
  requestId: string;
}

// Configuration from environment
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;
const CONTRACT_ID = import.meta.env.VITE_SOROBAN_CONTRACT_ID || '';

// Initialize Horizon server
const server = new Server(HORIZON_URL);

/**
 * Constructs and submits a verification request to the Soroban Smart Contract.
 * @param contentHash The SHA-256 hash of the content to verify
 * @param manifestHash Optional hash of the associated manifest metadata
 * @param publicKey The user's connected Stellar public key
 */
export const submitVerificationRequest = async (
  contentHash: string,
  manifestHash: string | null,
  publicKey: string
): Promise<SubmissionResult> => {
  try {
    // Validate contract ID is configured
    if (!CONTRACT_ID) {
      throw new Error('Soroban contract ID not configured. Please check your environment variables.');
    }

    console.log("Submitting verification request to Soroban:", { contentHash, manifestHash, publicKey });

    // Get network details to ensure we're on the right network
    const networkDetails = await walletService.getNetworkDetails();
    const networkPassphrase = networkDetails?.networkPassphrase || NETWORK_PASSPHRASE;
    
    // 1. Load the user's account from the network
    const account = await server.loadAccount(publicKey);
    
    // 2. Create the contract instance
    const contract = new Contract(CONTRACT_ID);
    
    // 3. Prepare the contract parameters
    // Convert hex strings to bytes
    const contentHashBytes = Buffer.from(contentHash.replace('0x', ''), 'hex');
    
    // Build Soroban parameters
    const params = [
      Address.fromString(publicKey).toScVal(),
      xdr.ScVal.scvBytes(contentHashBytes),
      manifestHash 
        ? xdr.ScVal.scvBytes(Buffer.from(manifestHash.replace('0x', ''), 'hex'))
        : xdr.ScVal.scvNone()
    ];
    
    // 4. Build the transaction with Soroban operation
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        contract.call(
          'submit_request',
          ...params
        )
      )
      .setTimeout(30)
      .build();

    // 5. Sign with Freighter wallet using the wallet service
    const signedXDR = await signTransaction(transaction.toXDR(), {
      address: publicKey,
      networkPassphrase: networkPassphrase,
    });

    // 6. Submit the transaction to the network
    const submittedTransaction = await server.submitTransaction(
      TransactionBuilder.fromXDR(signedXDR, networkPassphrase)
    );

    // 7. Extract request ID from transaction result or generate one
    let requestId = '';
    try {
      // Try to get the request ID from the transaction result
      // This will depend on your contract's event structure
      const txResult = xdr.TransactionResult.fromXDR(
        Buffer.from(submittedTransaction.resultXdr || '', 'base64')
      );
      
      // Check if there are events and extract the request ID
      const innerResult = txResult.result().innerResult();
      if (innerResult && innerResult.events()) {
        const events = innerResult.events() || [];
        if (events.length > 0) {
          // Parse the last event to get the request ID
          const lastEvent = events[events.length - 1];
          const eventData = lastEvent.data();
          
          // Try to extract the request ID from the event
          // This depends on your contract's event format
          if (eventData && eventData.value()) {
            // Simple extraction - adjust based on actual event structure
            const eventValue = eventData.value();
            if (eventValue && typeof eventValue === 'object' && 'bytes' in eventValue) {
              // If it's a bytes value, convert to hex string
              requestId = `0x${Buffer.from(eventValue.bytes).toString('hex').substring(0, 16)}`;
            }
          }
        }
      }
    } catch (parseError) {
      console.warn('Could not parse request ID from transaction result:', parseError);
    }

    // If we couldn't extract a request ID, generate one
    if (!requestId) {
      requestId = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    }

    console.log('Transaction successful:', {
      txHash: submittedTransaction.hash,
      requestId,
    });

    return {
      txHash: submittedTransaction.hash,
      requestId,
    };
  } catch (error) {
    console.error('Error submitting verification request:', error);
    
    // Handle user rejection
    if (error instanceof Error) {
      if (error.message.includes('User declined') || 
          error.message.includes('rejected') ||
          error.message.includes('Rejected')) {
        throw new Error('User declined the signing request');
      }
      
      // Handle specific transaction errors
      if (error.message.includes('tx_bad_seq')) {
        throw new Error('Transaction sequence error. Please try again.');
      }
      
      if (error.message.includes('insufficient balance')) {
        throw new Error('Insufficient balance to submit the verification request.');
      }
      
      throw new Error(`Transaction failed: ${error.message}`);
    }
    
    throw new Error('An unexpected error occurred while submitting the verification request');
  }
};

/**
 * Status of a verification request
 */
export type VerificationStatus = "pending" | "verified" | "failed" | "processing";

/**
 * Verification request interface
 */
export interface VerificationRequest {
  id: string;
  date: string;
  contentHash: string;
  status: VerificationStatus;
  txHash?: string;
  manifestHash?: string;
}

/**
 * Fetches verification requests for a given public key
 * @param publicKey The user's Stellar public key
 */
export const getVerificationRequests = async (publicKey: string): Promise<VerificationRequest[]> => {
  try {
    // Check if we have the contract configured
    if (!CONTRACT_ID) {
      console.warn('Contract ID not configured, returning mock data');
      return getMockRequests(publicKey);
    }

    // In a real implementation, you would query the contract
    // For now, we'll combine Horizon transaction data with mock data
    // TODO: Implement contract query when the contract has a query interface
    
    // You could query the contract for the user's requests:
    // const contract = new Contract(CONTRACT_ID);
    // const result = await contract.query('get_requests', Address.fromString(publicKey).toScVal());
    
    // For now, return mock data with some transaction info
    const mockRequests = getMockRequests(publicKey);
    
    // Try to fetch recent transactions to check if any were verification requests
    try {
      const { fetchRecentTransactions } = await import('./horizonService');
      const networkDetails = await walletService.getNetworkDetails();
      const network = networkDetails?.network || 'testnet';
      const transactions = await fetchRecentTransactions(publicKey, network);
      
      // If we have transactions, we could map them to verification requests
      // This is a basic integration - you can enhance this based on your needs
      if (transactions.length > 0) {
        // Map recent transactions that might be verification requests
        const txRequests = transactions
          .filter(tx => tx.memo && tx.memo.includes('Verify'))
          .map(tx => ({
            id: `TX-${tx.hash.substring(0, 8)}`,
            date: tx.createdAt,
            contentHash: `0x${tx.hash.substring(0, 64)}`,
            status: tx.successful ? 'verified' : 'failed' as VerificationStatus,
            txHash: tx.hash,
          }));
        
        // Combine with mock data
        return [...txRequests, ...mockRequests].slice(0, 10);
      }
    } catch (txError) {
      console.warn('Could not fetch recent transactions:', txError);
    }
    
    return mockRequests;
  } catch (error) {
    console.error('Error fetching verification requests:', error);
    // Return mock data as fallback
    return getMockRequests(publicKey);
  }
};

/**
 * Generate mock requests for development
 */
function getMockRequests(publicKey: string): VerificationRequest[] {
  const statuses: VerificationStatus[] = ["pending", "verified", "failed", "processing"];
  
  return Array.from({ length: 5 }, (_, i) => ({
    id: `REQ-${String(i + 1).padStart(4, "0")}`,
    date: new Date(Date.now() - i * 86400000 * 2).toISOString().split("T")[0],
    contentHash: `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}`,
    status: statuses[i % 4],
    txHash: i % 2 === 0 ? `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}` : undefined,
    manifestHash: i % 3 === 0 ? `0x${Math.random().toString(16).slice(2).padEnd(64, "0")}` : undefined,
  }));
}

/**
 * Check the status of a specific verification request
 * @param requestId The ID of the request to check
 * @param publicKey The user's public key
 */
export const checkVerificationStatus = async (
  requestId: string,
  publicKey: string
): Promise<VerificationStatus> => {
  try {
    // In a real implementation, you would query the contract
    // const contract = new Contract(CONTRACT_ID);
    // const result = await contract.query('get_request_status', ...);
    
    // For now, return a mock status
    await new Promise(resolve => setTimeout(resolve, 500));
    const statuses: VerificationStatus[] = ["pending", "verified", "failed"];
    return statuses[Math.floor(Math.random() * statuses.length)];
  } catch (error) {
    console.error('Error checking verification status:', error);
    return 'pending';
  }
};

export const verificationService = {
  async getRequests(publicKey: string): Promise<VerificationRequest[]> {
    return getVerificationRequests(publicKey);
  },
  async checkStatus(requestId: string, publicKey: string): Promise<VerificationStatus> {
    return checkVerificationStatus(requestId, publicKey);
  }
};