#!/usr/bin/env python3
"""
Pre-commit hook to prevent committing secrets and sensitive files
"""

import subprocess
import re
import sys

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
NC = '\033[0m'

# Patterns to detect secrets
SECRET_PATTERNS = [
    (r'AKIA[0-9A-Z]{16}', 'AWS Access Key ID'),
    (r'gh[pousr]_[A-Za-z0-9_]{36}', 'GitHub Token'),
    (r'sk_(live|test)_[a-zA-Z0-9]{24,}', 'Stripe Secret Key'),
    (r'sk-[a-zA-Z0-9]{48}', 'OpenAI API Key'),
    (r'xox[baprs]-[a-zA-Z0-9-]+', 'Slack Token'),
    (r'api[_-]?key\s*[:=]\s*["\']?[a-zA-Z0-9_\-]{16,}["\']?', 'API Key'),
    (r'api[_-]?secret\s*[:=]\s*["\']?[a-zA-Z0-9_\-]{16,}["\']?', 'API Secret'),
    (r'(auth|access)[_-]?token\s*[:=]\s*["\']?[a-zA-Z0-9_\-\.]{20,}["\']?', 'Auth Token'),
    (r'-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE\s+KEY-----', 'Private Key'),
    (r'(mongodb|postgres|mysql|redis)://[^:]+:[^@]+@', 'Database URL with password'),
]

# Forbidden file patterns
FORBIDDEN_PATTERNS = [
    (r'\.env($|\.[a-z]+)$', '.env file (except .env.example)'),
    (r'\.(pem|key|p12|pfx|keystore)$', 'Key/Certificate file'),
    (r'id_(rsa|dsa|ecdsa|ed25519)$', 'SSH private key'),
    (r'(credentials|secrets)\.(json|ya?ml)$', 'Credentials file'),
]

def get_staged_files():
    """Get list of staged files"""
    result = subprocess.run(
        ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
        capture_output=True, text=True
    )
    return result.stdout.strip().split('\n') if result.stdout.strip() else []

def get_file_content(filepath):
    """Get staged content of a file"""
    result = subprocess.run(
        ['git', 'show', f':{filepath}'],
        capture_output=True, text=True
    )
    return result.stdout if result.returncode == 0 else ''

def is_binary_or_lock_file(filename):
    """Check if file should be skipped"""
    binary_exts = ['.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.woff', '.woff2', 
                   '.ttf', '.eot', '.mp4', '.webm', '.mp3', '.wav', '.pdf', '.zip', 
                   '.tar', '.gz', '.exe', '.dll', '.so', '.dylib']
    lock_files = ['package-lock.json', 'yarn.lock', 'bun.lock', 'pnpm-lock.yaml', 
                  'Cargo.lock', 'Gemfile.lock']
    
    for ext in binary_exts:
        if filename.endswith(ext):
            return True
    for lock in lock_files:
        if filename.endswith(lock):
            return True
    return False

def main():
    print("Checking for secrets and sensitive files...")
    
    staged_files = get_staged_files()
    found_secrets = False
    
    # Check for forbidden files
    print("\nChecking for forbidden files...")
    for filepath in staged_files:
        for pattern, desc in FORBIDDEN_PATTERNS:
            if re.search(pattern, filepath, re.IGNORECASE):
                if desc.startswith('.env') and filepath.endswith('.env.example'):
                    continue
                print(f"{RED}ERROR: Forbidden file detected: {filepath}{NC}")
                print(f"  Type: {desc}")
                found_secrets = True
    
    # Check file contents
    print("\nChecking file contents for secrets...")
    for filepath in staged_files:
        if is_binary_or_lock_file(filepath):
            continue
        
        content = get_file_content(filepath)
        if not content:
            continue
        
        lines = content.split('\n')
        for line_num, line in enumerate(lines, 1):
            # Skip comments
            if re.match(r'^[\s]*(//|#|/\*|\*|<!--)', line):
                continue
            
            for pattern, desc in SECRET_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    # Skip false positives
                    if re.search(r'(example|dummy|placeholder|xxx|your_|changeme|process\.env)', line, re.IGNORECASE):
                        continue
                    print(f"{RED}ERROR: Potential {desc} in {filepath} line {line_num}{NC}")
                    found_secrets = True
    
    # Summary
    print("")
    if found_secrets:
        print(f"{RED}COMMIT BLOCKED: Potential secrets or sensitive files found{NC}")
        print("To bypass this check use: git commit --no-verify")
        sys.exit(1)
    else:
        print(f"{GREEN}No secrets or sensitive files detected{NC}")
        sys.exit(0)

if __name__ == '__main__':
    main()
