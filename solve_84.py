import os
import re

def create_barrel_export(folder_path):
    if not os.path.exists(folder_path):
        print(f"Folder {folder_path} doesn't exist.")
        return []
    exports = []
    files_exported = []
    for f in os.listdir(folder_path):
        if f.endswith('.tsx') or f.endswith('.ts'):
            if f == 'index.ts' or f == 'index.tsx':
                continue
            name = f.split('.')[0]
            # check if it exports default or named
            with open(os.path.join(folder_path, f), 'r') as file:
                content = file.read()
                if f"export default {name}" in content or f"export default function {name}" in content:
                    exports.append(f"export {{ default as {name} }} from './{name}';")
                elif "export function" in content or "export const" in content:
                    exports.append(f"export * from './{name}';")
                elif "export " in content:
                    # just try named exports as a fallback
                    exports.append(f"export * from './{name}';")
                else:
                    # fallback to named if unknown but it's UI components so usually named exports
                    # e.g., export { Button, buttonVariants }
                    pass
            # Just export all from it, it's easier and usually works for shadcn components
            exports.append(f"export * from './{name}';")
            files_exported.append(name)
            
    # For UI components, typically it's `export * from './button'`
    # Let's just do `export *` for all of them to be safe.
    barrel_content = "\n".join([f"export * from './{name}';" for name in files_exported])
    with open(os.path.join(folder_path, 'index.ts'), 'w') as index_file:
        index_file.write(barrel_content)
    print(f"Created barrel in {folder_path} with {len(files_exported)} files.")
    return files_exported

def replace_imports_in_dir(src_dir, folders_exported_map):
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                
                original_content = content
                
                # We need to replace import { X } from '@/components/ui/X' with import { X } from '@/components/ui'
                # A regex to match: import { ... } from '@/components/ui/[something]'
                # We can just match line by line
                lines = content.split('\n')
                new_lines = []
                # Simple replacement for typical imports:
                # import { Button } from "@/components/ui/button" -> import { Button } from "@/components/ui"
                
                for line in lines:
                    replaced = False
                    for folder, files_exported in folders_exported_map.items():
                        # e.g., folder = 'ui'
                        if f"@/components/{folder}/" in line and not line.strip().startswith("//"):
                            # Check if the line is an import
                            if line.strip().startswith("import "):
                                # replace `@/components/ui/XXX` with `@/components/ui`
                                line = re.sub(fr"@/components/{folder}/[\w\-]+", f"@/components/{folder}", line)
                                replaced = True
                    new_lines.append(line)
                
                new_content = '\n'.join(new_lines)
                if new_content != original_content:
                    with open(path, 'w') as f:
                        f.write(new_content)
                    print(f"Updated imports in {path}")

if __name__ == "__main__":
    base = "."
    ui_files = create_barrel_export(os.path.join(base, "components/ui"))
    layout_files = create_barrel_export(os.path.join(base, "components/layout"))
    shared_files = create_barrel_export(os.path.join(base, "components/shared"))
    
    folders_exported = {
        "ui": ui_files,
        "layout": layout_files,
        "shared": shared_files
    }
    
    replace_imports_in_dir(os.path.join(base, "app"), folders_exported)
    replace_imports_in_dir(os.path.join(base, "components"), folders_exported)
    replace_imports_in_dir(os.path.join(base, "lib"), folders_exported)
