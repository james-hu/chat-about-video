import type { AxiosInstance } from 'axios';

import Axios from 'axios';



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

  async getIndex(indexName: string): Promise<IndexSummary> {
    const response = await this.axios.get<IndexSummary>(`/indexes/${indexName}?api-version=${this.apiVersion}`);
    return response.data;
  }

  async createIndex(indexName: string, indexOptions: CreateIndexOptions = {
    metadataSchema: {
      fields: [
        {
          name: 'timestamp',
          searchable: false,
          filterable: true,
          type: 'datetime',
        },
      ],
    },
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

  async deleteIndex(indexName: string): Promise<void> {
    await this.axios.delete(`/indexes/${indexName}?api-version=${this.apiVersion}`);
  }

  async listDocuments(indexName: string): Promise<DocumentSummary[]> {
    const response = await this.axios.get<PaginatedWithNextLink<DocumentSummary>>(`/indexes/${indexName}/documents?api-version=${this.apiVersion}`);
    return response.data.value;
  }
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