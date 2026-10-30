#!/bin/sh
# Installs only the standalone ferrus-nano binary through the shared ferrus
# installer, which does the download, checksum verification, and install.
#
#   curl -fsSL https://ferrus.dev/nano/install.sh | sh
#
# Extra arguments and FERRUS_INSTALL_* variables reach the shared installer.
set -eu

INSTALLER_URL="https://ferrus.dev/cli/install.sh"

# Everything runs from main so a truncated download can't execute partially.
main() {
    installer="$(mktemp)"
    trap 'rm -f "$installer"' EXIT INT TERM

    # Download to a file: without pipefail, `curl | sh` would hide a failed fetch.
    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$INSTALLER_URL" -o "$installer"
    elif command -v wget >/dev/null 2>&1; then
        wget -qO "$installer" "$INSTALLER_URL"
    else
        echo "error: either curl or wget is required" >&2
        exit 1
    fi

    # Last so this script always installs Nano, whatever the extra arguments say.
    sh "$installer" "$@" --components nano
}

main "$@"
