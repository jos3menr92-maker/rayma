#!/bin/bash

# Find files in src/pages/, src/components/, src/hooks/, src/lib/
# and replace both "@/lib/supabaseClient" and "@/api/supabaseClient"
# with "@/lib/supabaseClientFrontend"

find src/pages src/components src/hooks src/lib -type f -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | while read -r file; do
    sed -i 's|@/lib/supabaseClient"|@/lib/supabaseClientFrontend"|g' "$file"
    sed -i "s|@/lib/supabaseClient'|@/lib/supabaseClientFrontend'|g" "$file"
    sed -i 's|@/api/supabaseClient"|@/lib/supabaseClientFrontend"|g' "$file"
    sed -i "s|@/api/supabaseClient'|@/lib/supabaseClientFrontend'|g" "$file"
    
    # Also handle relative imports if any
    sed -i 's|from "./supabaseClient"|from "./supabaseClientFrontend"|g' "$file"
    sed -i "s|from './supabaseClient'|from './supabaseClientFrontend'|g" "$file"
done

