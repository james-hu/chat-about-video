import { generateRandomString } from '@handy-common-utils/misc-utils';
import { FIBONACCI_SEQUENCE, withRetry } from '@handy-common-utils/promise-utils';
import Axios, { AxiosInstance, isAxiosError } from 'axios';



export class VideoRetrievalApiClient {
  private axios: AxiosInstance;
  constructor(endpointBaseUrl: string, apiKey: string, private readonly apiVersion = '2023-05-01-preview') {
    this.axios = Axios.create({
      baseURL: `${endpointBaseUrl}/computervision/retrieval`,
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });
  }

  async listIndexes(): Promise<IndexSummary[]> {
    const response = await this.axios.get<PaginatedWithNextLink<IndexSummary>>(`/indexes?api-version=${this.apiVersion}`);
    return response.data.value;
  }

  async getIndex(indexName: string): Promise<IndexSummary | undefined> {
    try {
      const response = await this.axios.get<IndexSummary>(`/indexes/${indexName}?api-version=${this.apiVersion}`);
      return response.data;
    } catch (error: any) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async createIndex(indexName: string, indexOptions: CreateIndexOptions = {
    features: [
      {
        name: 'vision',
        domain: 'surveillance',
      },
      {
        name: 'speech',
      },
    ],
  }): Promise<void> {
    await this.axios.put(`/indexes/${indexName}?api-version=${this.apiVersion}`, indexOptions);
  }

  async createIndexIfNotExist(indexName: string, indexOptions?: CreateIndexOptions): Promise<void> {
    const index = await this.getIndex(indexName);
    if (!index) {
      await this.createIndex(indexName, indexOptions);
    }
  }

  async deleteIndex(indexName: string): Promise<void> {
    await this.axios.delete(`/indexes/${indexName}?api-version=${this.apiVersion}`);
  }

  async listDocuments(indexName: string): Promise<DocumentSummary[]> {
    const response = await this.axios.get<PaginatedWithNextLink<DocumentSummary>>(`/indexes/${indexName}/documents?api-version=${this.apiVersion}`);
    return response.data.value;
  }

  async createIngestion(indexName: string, ingestionName: string, ingestion: IngestionRequest): Promise<void> {
    await this.axios.put(`/indexes/${indexName}/ingestions/${ingestionName}?api-version=${this.apiVersion}`, ingestion);
  }

  async deleteDocument(indexName: string, documentUrl: string): Promise<void> {
    await this.createIngestion(indexName, `delete-${generateRandomString(24)}`, {
      videos: [
        {
          mode: 'remove',
          documentUrl,
        },
      ],
    });
  }

  async getIngestion(indexName: string, ingestionName: string): Promise<IngestionSummary> {
    const response = await this.axios.get<IngestionSummary>(`/indexes/${indexName}/ingestions/${ingestionName}?api-version=${this.apiVersion}`);
    return response.data;
  }

  async ingest(indexName: string, ingestionName: string, ingestion: IngestionRequest, backoff: number[] = Array.from({ length: FIBONACCI_SEQUENCE.length }, (_v, i) => 10000 * Math.min(FIBONACCI_SEQUENCE[i], 10))): Promise<void> {
    await this.createIngestion(indexName, ingestionName, ingestion);
    const ingestionResult = await withRetry(() => this.getIngestion(indexName, ingestionName), backoff, (_error, result) => {
      switch (result?.state) {
        case 'NotStarted':
        case 'PartiallySucceeded':
        case 'Running': {
          return true;
        }
        default: {
          return false;
        }
      }
    });
    if (ingestionResult.state !== 'Completed') {
      throw new Error(`Ingestion ${ingestionName} for index ${indexName} didn't complete. State: ${ingestionResult.state}`);
    }
  }
}

export interface IngestionSummary {
  name: string;
  state: 'NotStarted' | 'Running' | 'Completed' | 'Failed' | 'PartiallySucceeded';
  batchName?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  fileStatusDetails?: IngestionStatusDetail[]
}

export interface IngestionStatusDetail {
  documentId: string;
  lastUpdatedTime: string;
  documentUrl: string;
  succeeded: boolean;
}

export interface IngestionRequest {
  videos: VideoIngestion[];
  moderation?: boolean;
  generateInsightIntervals?: boolean;
  filterDefectedFrames?: boolean;
  includeSpeechTranscript?: boolean;
}

export interface VideoIngestion {
  mode: 'add' | 'update' | 'remove';
  documentId?: string;
  documentUrl: string;
  metadata?: object;
  userData?: object;
}

export interface DocumentSummary {
  documentId: string;
  documentUrl?: string;
  metadata?: object;
  createdDateTime: string;
  lastModifiedDateTime: string;
  userData?: object;
}

export interface CreateIndexOptions {
  metadataSchema?: IndexMetadataSchema;
  features?: IndexFeature[];
  userData?: object;
}

export type PaginatedWithNextLink<T> = {
  value: T[];
  nextLink?: string;
}

export interface IndexSummary {
  name: string;
  userData?: object;
  features?: IndexFeature[];
  eTag: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export interface IndexFeature {
  name: 'vision' | 'speech';
  modelVersion?: string;
  domain?: 'generic' | 'surveillance';
}

export interface IndexMetadataSchema {
  language?: string;
  fields: IndexMetadataSchemaField[];
}

export interface IndexMetadataSchemaField {
  name: string;
  searchable: boolean;
  filterable: boolean;
  type: 'string' | 'datetime';
}