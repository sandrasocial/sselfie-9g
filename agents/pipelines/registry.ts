/**
 * Pipeline Registry
 * Central registry for all pre-built automation pipelines
 */

import * as Pipelines from "./index"

export interface PipelineCreator {
  (input: any): import("@/agents/orchestrator/pipeline").PipelineOrchestrator
}

export const PipelineRegistry = {
  /**
   * List all available pipeline names
   */
  list(): string[] {
    return Object.keys(Pipelines).filter((key) => key.startsWith("create"))
  },

  /**
   * Get a pipeline creator function by name
   * @param name - Pipeline name (e.g., "WinbackPipeline" or "createWinbackPipeline")
   */
  get(name: string): PipelineCreator | null {
    // Try exact match first
    if (name in Pipelines) {
      return (Pipelines as any)[name] as PipelineCreator
    }

    // Try with "create" prefix
    const withPrefix = `create${name.charAt(0).toUpperCase() + name.slice(1)}Pipeline`
    if (withPrefix in Pipelines) {
      return (Pipelines as any)[withPrefix] as PipelineCreator
    }

    // Try camelCase conversion
    const camelCase = name
      .split("-")
      .map((word, idx) => (idx === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join("")
    const camelCaseWithPrefix = `create${camelCase.charAt(0).toUpperCase() + camelCase.slice(1)}Pipeline`
    if (camelCaseWithPrefix in Pipelines) {
      return (Pipelines as any)[camelCaseWithPrefix] as PipelineCreator
    }

    return null
  },

  /**
   * Check if a pipeline exists
   */
  has(name: string): boolean {
    return this.get(name) !== null
  },

  /**
   * Check if a pipeline is a parallel pipeline
   * @param pipelineFn - Pipeline creator function
   */
  isParallel(pipelineFn: PipelineCreator | null): boolean {
    if (!pipelineFn) return false
    return (pipelineFn as any).__parallel === true
  },

  /**
   * Get metadata for all pipelines
   */
  getAllMetadata() {
    return this.list().map((name) => {
      const fn = this.get(name)
      return {
        name: name.replace("create", "").replace("Pipeline", ""),
        functionName: name,
        isParallel: this.isParallel(fn),
      }
    })
  },
}

