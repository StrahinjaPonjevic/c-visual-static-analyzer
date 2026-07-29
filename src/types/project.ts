export interface FileNode {
  name: string
  path: string
  relativePath: string
  isDirectory: boolean
  children?: FileNode[]
  extension?: string
  errorCount?: number
  warningCount?: number
}

export interface ProjectConfig {
  mainFile?: string
  includeDirs?: string[]
  outputName?: string
  extraFlags?: string[]
}

export interface ProjectState {
  rootPath: string | null
  projectName: string | null
  tree: FileNode[]
  activeFilePath: string | null
  openFilePaths: string[]
}
