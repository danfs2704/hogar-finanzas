#!/usr/bin/env python3
"""Add householdId to all fetch calls in finance components and page.tsx"""
import re, os, glob

BASE = '/home/z/my-project/src/components/finance'
PAGE = '/home/z/my-project/src/app/page.tsx'

def add_hhid_to_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # For components that use useAppStore, add hid variable and modify fetches
    # Pattern 1: In useEffect fetches, add ?householdId=${hid}
    
    # Add `const hid = user?.householdId;` after useAppStore destructure if not present
    if 'householdId' not in content and 'useAppStore' in content:
        # Find the useAppStore destructure
        content = content.replace(
            "const { triggerRefresh, refreshKey } = useAppStore();",
            "const { triggerRefresh, refreshKey, user } = useAppStore();\n  const hid = user?.householdId;"
        )
        content = content.replace(
            "const { triggerRefresh, refreshKey, user } = useAppStore();",
            "const { triggerRefresh, refreshKey, user } = useAppStore();\n  const hid = user?.householdId;"
        )
        content = content.replace(
            "const { currentView, setCurrentView, user, setUser } = useAppStore();",
            "const { currentView, setCurrentView, user, setUser } = useAppStore();\n  const hid = user?.householdId;"
        )
    
    # Add householdId to fetch URLs that don't already have it
    # Pattern: fetch('/api/accounts') -> fetch(`/api/accounts?householdId=${hid}`)
    api_endpoints = [
        '/api/accounts', '/api/members', '/api/pets', '/api/categories', '/api/analytics',
        '/api/users', '/api/household'
    ]
    
    for ep in api_endpoints:
        # fetch('/api/xxx') -> fetch(`/api/xxx?householdId=${hid}`)
        # But NOT for POST/PUT/DELETE with method:
        # Only for GET-like fetches (no method specified)
        
        # Replace simple fetch calls in GET context
        content = re.sub(
            rf"fetch\(['\"]({re.escape(ep)})(?![?])['\"]\)",
            f"fetch(\`{ep}?householdId=${{hid}}\`)",
            content
        )
    
    # For transactions endpoint which already has params sometimes
    content = re.sub(
        r"fetch\(['\`]/api/transactions\?(householdId=[^'\`]*)['\`]\)",
        lambda m: m.group(0) if 'householdId' in m.group(0) else f"fetch(`/api/transactions?{m.group(1)}&householdId=${{hid}}`)"
        , content
    )
    content = content.replace(
        "fetch(`/api/transactions?${params}`)",
        "fetch(`/api/transactions?householdId=${hid}&${params}`)"
    )
    content = content.replace(
        "fetch('/api/transactions?limit=8')",
        "fetch(`/api/transactions?householdId=${hid}&limit=8`)"
    )
    
    # For POST/PUT fetch calls in handleSave functions, add householdId to the body
    # Pattern: body: JSON.stringify({ name, ... }) -> body: JSON.stringify({ name, ..., householdId: hid })
    
    # In handleSave for accounts:
    content = content.replace(
        "body: JSON.stringify(form) }",
        "body: JSON.stringify({ ...form, householdId: hid }) }"
    )
    content = content.replace(
        "body: JSON.stringify({ id: editing.id, ...form }) }",
        "body: JSON.stringify({ id: editing.id, ...form, householdId: hid }) }"
    )
    
    # In handleSaveMember/handleSavePet
    content = content.replace(
        "body: JSON.stringify(memberForm) }",
        "body: JSON.stringify({ ...memberForm, householdId: hid }) }"
    )
    content = content.replace(
        "body: JSON.stringify({ id: editMember.id, ...memberForm }) }",
        "body: JSON.stringify({ id: editMember.id, ...memberForm, householdId: hid }) }"
    )
    content = content.replace(
        "body: JSON.stringify(petForm) }",
        "body: JSON.stringify({ ...petForm, householdId: hid }) }"
    )
    content = content.replace(
        "body: JSON.stringify({ id: editPet.id, ...petForm }) }",
        "body: JSON.stringify({ id: editPet.id, ...petForm, householdId: hid }) }"
    )
    
    # Categories POST
    content = content.replace(
        "body: JSON.stringify(catForm) }",
        "body: JSON.stringify({ ...catForm, householdId: hid }) }"
    )
    content = content.replace(
        "body: JSON.stringify({ id: editCat.id, name: catForm.name, icon: catForm.icon, color: catForm.color }) }",
        "body: JSON.stringify({ id: editCat.id, name: catForm.name, icon: catForm.icon, color: catForm.color, householdId: hid }) }"
    )
    
    # Subcategories POST
    content = content.replace(
        "body: JSON.stringify({ ...subForm, categoryId: selectedCatId }) }",
        "body: JSON.stringify({ ...subForm, categoryId: selectedCatId, householdId: hid }) }"
    )
    
    # Transactions POST
    content = content.replace(
        "body: JSON.stringify({\n        ...form,\n        amount: parseFloat(form.amount),\n        subcategoryId: form.subcategoryId || null,\n        memberId: form.memberId || null,\n        petId: form.petId || null,\n        userId: user?.id || null,\n      })",
        "body: JSON.stringify({\n        ...form,\n        amount: parseFloat(form.amount),\n        subcategoryId: form.subcategoryId || null,\n        memberId: form.memberId || null,\n        petId: form.petId || null,\n        userId: user?.id || null,\n        householdId: hid,\n      })"
    )
    
    # Add hid guard to useEffect
    content = content.replace(
        'useEffect(() => {\n    let cancelled = false;\n    Promise.all',
        'useEffect(() => {\n    let cancelled = false;\n    if (!hid) return;\n    Promise.all'
    )
    content = content.replace(
        'useEffect(() => {\n    fetch',
        'useEffect(() => {\n    if (!hid) return;\n    fetch'
    )
    content = content.replace(
        'useEffect(() => {\n    setLoading',
        'useEffect(() => {\n    if (!hid) return;\n    setLoading'
    )
    
    # Add hid to dependency arrays
    content = content.replace(
        '}, [refreshKey]);',
        '}, [refreshKey, hid]);'
    )
    content = content.replace(
        '}, [loadData, refreshKey]);',
        '}, [loadData, refreshKey, hid]);'
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f'Updated: {filepath}')
    else:
        print(f'No changes: {filepath}')

# Process all finance components
for f in sorted(glob.glob(os.path.join(BASE, '*.tsx'))):
    add_hhid_to_file(f)

# Process page.tsx
add_hhid_to_file(PAGE)
print('Done!')
