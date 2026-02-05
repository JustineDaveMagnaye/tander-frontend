const { withAndroidManifest, AndroidConfig } = require("@expo/config-plugins");
const { mkdirSync, writeFileSync, existsSync } = require("fs");
const { join } = require("path");

/**
 * Plugin to add Android network security config
 * Fixes SSL certificate verification issues with api.tanderconnect.com
 */
function withNetworkSecurityConfig(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    // Add network security config attribute
    mainApplication.$["android:networkSecurityConfig"] = "@xml/network_security_config";

    return config;
  });
}

// Create a separate mod to write the XML file
const { withDangerousMod } = require("@expo/config-plugins");

function withNetworkSecurityConfigFile(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const resPath = join(config.modRequest.platformProjectRoot, "app", "src", "main", "res");
      const xmlPath = join(resPath, "xml");

      // Create xml directory if it doesn't exist
      if (!existsSync(xmlPath)) {
        mkdirSync(xmlPath, { recursive: true });
      }

      // Write network security config
      const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Trust system CAs and allow connections to our API -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>

    <!-- Specific config for our API domain -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.tanderconnect.com</domain>
        <domain includeSubdomains="true">tanderconnect.com</domain>
        <domain includeSubdomains="true">azurewebsites.net</domain>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </domain-config>
</network-security-config>`;

      writeFileSync(join(xmlPath, "network_security_config.xml"), networkSecurityConfig);

      return config;
    },
  ]);
}

module.exports = function withNetworkSecurity(config) {
  config = withNetworkSecurityConfigFile(config);
  config = withNetworkSecurityConfig(config);
  return config;
};
