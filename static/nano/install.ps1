# Installs only the standalone ferrus-nano binary through the shared ferrus
# installer, which does the download, checksum verification, and install.
#
#   irm https://ferrus.dev/nano/install.ps1 | iex
#
# FERRUS_INSTALL_* environment variables reach the shared installer.

# Invoke-RestMethod, not Invoke-WebRequest: the release asset is served as
# application/octet-stream, and only Invoke-RestMethod decodes that to a string.
& ([scriptblock]::Create((Invoke-RestMethod "https://ferrus.dev/cli/install.ps1"))) -Components nano
