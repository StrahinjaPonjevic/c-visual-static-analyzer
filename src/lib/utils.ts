import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripCommentsAndStrings(code: string): string {
  let result = ''
  let i = 0
  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++
    } else if (code[i] === '/' && code[i + 1] === '*') {
      result += ' '
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') result += '\n'
        i++
      }
      if (i < code.length) i += 2
    } else if (code[i] === '"') {
      result += ' '
      i++
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') i++
        i++
      }
      i++
    } else if (code[i] === "'") {
      result += ' '
      i++
      while (i < code.length && code[i] !== "'") {
        if (code[i] === '\\') i++
        i++
      }
      i++
    } else {
      result += code[i]
      i++
    }
  }
  return result
}
