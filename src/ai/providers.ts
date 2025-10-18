import { createAzure } from "@ai-sdk/azure";
import { createLogger } from "./logger";
import { openai } from "@ai-sdk/openai";

const logger = createLogger("ai:providers");

// AI Provider Types
export enum AIProvider {
  OPENAI = "openai",
  AZURE_OPENAI = "azure_openai"
}

export enum OpenAIModel {
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
  TEXT_EMBEDDING_3_SMALL = "text-embedding-3-small",
  TEXT_EMBEDDING_3_LARGE = "text-embedding-3-large"
}

export enum AzureOpenAIModel {
  GPT_5_MINI = "gpt-5-mini",
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
  TEXT_EMBEDDING_3_SMALL = "text-embedding-3-small"
}

// Configuration interfaces
export interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
}

export interface AzureOpenAIConfig {
  apiKey: string;
  resourceName: string;
  deploymentName: string;
  apiVersion: string;
}

export interface ModelConfig {
  name: string;
  provider: AIProvider;
  config: OpenAIConfig | AzureOpenAIConfig;
}

// Environment variable helpers
function getEnvString(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || defaultValue!;
}

function getEnvStringOptional(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

// Get model configurations dynamically - Azure OpenAI only
function getModelConfigurations(): ModelConfig[] {
  return [
    // Azure OpenAI configurations only
    {
      name: AzureOpenAIModel.GPT_5_MINI,
      provider: AIProvider.AZURE_OPENAI,
      config: {
        deploymentName: getEnvString("AZURE_OPENAI_GPT_5_MINI_DEPLOYMENT_NAME"),
        apiKey: getEnvString("AZURE_OPENAI_API_KEY"),
        resourceName: getEnvString("AZURE_OPENAI_RESOURCE_NAME"),
        apiVersion: getEnvString("AZURE_OPENAI_GPT_5_MINI_API_VERSION"),
      }
    }
  ];
}

/**
 * Creates and configures Azure OpenAI provider instance
 * Only supports Azure OpenAI with GPT-5 mini
 */
export function createAIProvider(
  modelName: string = AzureOpenAIModel.GPT_5_MINI,
  provider: AIProvider = AIProvider.AZURE_OPENAI
): {
  model: any;
  config: AzureOpenAIConfig;
} {
  try {
    const modelConfigurations = getModelConfigurations();
    const modelConfig = modelConfigurations.find(
      (config) => config.name === modelName && config.provider === provider
    );

    if (!modelConfig) {
      throw new Error(`Model ${modelName} with provider ${provider} not found`);
    }

    const config = modelConfig.config as AzureOpenAIConfig;

    // Validate required configuration
    if (!config.apiKey) {
      throw new Error(`API key is required for ${provider} provider`);
    }

    logger.info("Creating Azure OpenAI provider", {
      model: modelName,
      provider: provider,
      hasApiKey: !!config.apiKey
    });

    // Validate Azure-specific configuration
    if (!config.resourceName || !config.deploymentName || !config.apiVersion) {
      throw new Error("Azure OpenAI configuration is incomplete");
    }

    // Create Azure OpenAI provider
    const azure = createAzure({
      resourceName: config.resourceName,
      apiKey: config.apiKey,
      // apiVersion: config.apiVersion,
    });

    // Create model instance with deployment name
    const model = azure(config.deploymentName);

    return {
      model,
      config
    };
  } catch (error) {
    logger.error("Failed to create AI provider", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      model: modelName,
      provider: provider
    });
    throw error;
  }
}

/**
 * Creates Azure OpenAI provider with GPT-5 mini
 */
export function createAzureOpenAIProvider(modelName: AzureOpenAIModel = AzureOpenAIModel.GPT_5_MINI) {
  return createAIProvider(modelName, AIProvider.AZURE_OPENAI);
}

/**
 * Auto-detect and create Azure OpenAI provider
 */
export function createAutoProvider(modelName: string = AzureOpenAIModel.GPT_5_MINI) {
  try {
    // Only use Azure OpenAI
    if (process.env.AZURE_OPENAI_API_KEY) {
      logger.info("Using Azure OpenAI provider");
      return createAzureOpenAIProvider(modelName as AzureOpenAIModel);
    }
    
    throw new Error("No Azure OpenAI configuration found. Please set AZURE_OPENAI_API_KEY");
  } catch (error) {
    logger.error("Failed to create auto provider", { error });
    throw error;
  }
}

// Centralized AI provider instance
let aiProviderInstance: any = null;

/**
 * Get or create the centralized AI provider instance
 */
export function getAIProvider() {
  if (!aiProviderInstance) {
    try {
      aiProviderInstance = createAutoProvider();
      logger.info("Created centralized AI provider instance");
    } catch (error) {
      logger.error("Failed to create centralized AI provider", { error });
      return null;
    }
  }
  return aiProviderInstance;
}

/**
 * Reset the AI provider instance (useful for testing)
 */
export function resetAIProvider() {
  aiProviderInstance = null;
}
