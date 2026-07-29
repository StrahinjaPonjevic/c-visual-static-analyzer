import { useState } from "react"
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit2,
  File,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { FileNode } from "@/types/project"

interface FileExplorerProps {
  projectName: string | null
  projectPath: string | null
  tree: FileNode[]
  activeFilePath: string | null
  fileErrorCounts?: Record<string, { errors: number; warnings: number }>
  onSelectFile: (filePath: string) => void
  onRefreshTree: () => void
  onCreateFile: (parentDir: string, fileName: string) => void
  onCreateFolder: (parentDir: string, folderName: string) => void
  onRenameItem: (oldPath: string, newPath: string) => void
  onDeleteItem: (targetPath: string) => void
}

export function FileExplorer({
  projectName,
  projectPath,
  tree,
  activeFilePath,
  fileErrorCounts = {},
  onSelectFile,
  onRefreshTree,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null)
  const [targetDir, setTargetDir] = useState<string | null>(null)
  const [inputName, setInputName] = useState('')

  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [renameInput, setRenameInput] = useState('')

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  const handleStartCreate = (parentPath: string, type: 'file' | 'folder') => {
    setCreatingType(type)
    setTargetDir(parentPath)
    setInputName('')
    setExpandedFolders((prev) => ({ ...prev, [parentPath]: true }))
  }

  const handleConfirmCreate = () => {
    if (!inputName.trim() || !targetDir) {
      setCreatingType(null)
      return
    }
    if (creatingType === 'file') {
      onCreateFile(targetDir, inputName.trim())
    } else if (creatingType === 'folder') {
      onCreateFolder(targetDir, inputName.trim())
    }
    setCreatingType(null)
    setInputName('')
  }

  const handleStartRename = (item: FileNode) => {
    setRenamingPath(item.path)
    setRenameInput(item.name)
  }

  const handleConfirmRename = (oldPath: string) => {
    if (!renameInput.trim() || renameInput === oldPath) {
      setRenamingPath(null)
      return
    }
    const dir = oldPath.substring(0, Math.max(oldPath.lastIndexOf('/'), oldPath.lastIndexOf('\\')))
    const newPath = dir ? `${dir}/${renameInput.trim()}` : renameInput.trim()
    onRenameItem(oldPath, newPath)
    setRenamingPath(null)
  }

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedFolders[node.path] ?? true
      const isActive = node.path === activeFilePath
      const errorData = fileErrorCounts[node.path]
      const isHeader = node.name.endsWith('.h') || node.name.endsWith('.hpp')
      const isC = node.name.endsWith('.c') || node.name.endsWith('.cpp')

      if (node.isDirectory) {
        return (
          <div key={node.path} className="select-none">
            <div
              className={cn(
                "group flex h-7 items-center justify-between px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer rounded-sm transition-colors",
                level > 0 && "ml-2"
              )}
              onClick={() => toggleFolder(node.path)}
            >
              <div className="flex items-center gap-1.5 truncate">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                ) : (
                  <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                )}
                {renamingPath === node.path ? (
                  <Input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmRename(node.path)
                      if (e.key === 'Escape') setRenamingPath(null)
                    }}
                    onBlur={() => handleConfirmRename(node.path)}
                    autoFocus
                    className="h-6 w-28 px-1 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate font-medium">{node.name}</span>
                )}
              </div>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartCreate(node.path, 'file')
                  }}
                  title="Novi fajl u ovom folderu"
                >
                  <FilePlus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartCreate(node.path, 'folder')
                  }}
                  title="Novi podfolder"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="pl-2 border-l border-border/30 ml-2.5 my-0.5">
                {creatingType && targetDir === node.path && (
                  <div className="flex items-center gap-1 px-2 py-1">
                    {creatingType === 'file' ? (
                      <File className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                    <Input
                      type="text"
                      placeholder={creatingType === 'file' ? 'Naziv.c...' : 'Naziv foldera...'}
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmCreate()
                        if (e.key === 'Escape') setCreatingType(null)
                      }}
                      onBlur={handleConfirmCreate}
                      autoFocus
                      className="h-6 w-full text-xs"
                    />
                  </div>
                )}
                {node.children && renderTree(node.children, level + 1)}
              </div>
            )}
          </div>
        )
      }

      return (
        <div
          key={node.path}
          className={cn(
            "group flex h-7 items-center justify-between px-2 text-xs cursor-pointer rounded-sm transition-colors select-none",
            isActive
              ? "bg-primary/15 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            level > 0 && "ml-2"
          )}
          onClick={() => onSelectFile(node.path)}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isC ? (
              <FileCode className="h-3.5 w-3.5 shrink-0 text-blue-400" />
            ) : isHeader ? (
              <FileText className="h-3.5 w-3.5 shrink-0 text-purple-400" />
            ) : (
              <File className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            )}
            {renamingPath === node.path ? (
              <Input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename(node.path)
                  if (e.key === 'Escape') setRenamingPath(null)
                }}
                onBlur={() => handleConfirmRename(node.path)}
                autoFocus
                className="h-6 w-28 px-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {errorData && errorData.errors > 0 && (
              <Badge variant="destructive" className="h-4 px-1 text-[10px] font-bold min-w-[16px] justify-center">
                {errorData.errors}
              </Badge>
            )}
            {errorData && errorData.warnings > 0 && errorData.errors === 0 && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] font-bold bg-amber-500/20 text-amber-400 border-amber-500/30 min-w-[16px] justify-center">
                {errorData.warnings}
              </Badge>
            )}

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartRename(node)
                }}
                title="Preimenuj"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteItem(node.path)
                }}
                title="Obriši"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col h-full bg-muted/20 border-r w-full">
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b bg-secondary/50">
        <span className="text-xs font-semibold text-foreground truncate uppercase tracking-wider">
          {projectName || "File Explorer"}
        </span>
        {projectPath && (
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleStartCreate(projectPath, 'file')}
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novi fajl u korenskom folderu</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleStartCreate(projectPath, 'folder')}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novi folder u korenskom folderu</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onRefreshTree}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Osveži stablo fajlova</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Tree Content */}
      <ScrollArea className="flex-1 p-1.5">
        {creatingType && targetDir === projectPath && (
          <div className="flex items-center gap-1 px-2 py-1">
            {creatingType === 'file' ? (
              <File className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            )}
            <Input
              type="text"
              placeholder={creatingType === 'file' ? 'Naziv.c...' : 'Naziv foldera...'}
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreate()
                if (e.key === 'Escape') setCreatingType(null)
              }}
              onBlur={handleConfirmCreate}
              autoFocus
              className="h-6 w-full text-xs"
            />
          </div>
        )}
        {tree.length > 0 ? (
          renderTree(tree)
        ) : (
          <div className="text-xs text-muted-foreground p-3 text-center">
            {projectPath ? "Folder je prazan." : "Otvorite projekat za prikaz fajlova."}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
