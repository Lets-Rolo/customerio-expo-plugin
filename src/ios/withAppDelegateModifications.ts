import { ConfigPlugin, withAppDelegate } from '@expo/config-plugins';
import { getAppDelegateHeaderFilePath } from '@expo/config-plugins/build/ios/Paths';

import {
  CIO_APPDELEGATEDECLARATION_REGEX,
  CIO_APPDELEGATEHEADER_REGEX,
  CIO_APPDELEGATEHEADER_SNIPPET,
  CIO_CONFIGURECIOSDKPUSHNOTIFICATION_SNIPPET,
  CIO_DIDFAILTOREGISTERFORREMOTENOTIFICATIONSWITHERRORFULL_REGEX,
  CIO_DIDFAILTOREGISTERFORREMOTENOTIFICATIONSWITHERROR_REGEX,
  CIO_DIDFAILTOREGISTERFORREMOTENOTIFICATIONSWITHERROR_SNIPPET,
  CIO_DIDFINISHLAUNCHINGMETHOD_REGEX,
  CIO_DIDRECEIVENOTIFICATIONRESPONSEHANDLER_SNIPPET,
  CIO_DIDREGISTERFORREMOTENOTIFICATIONSWITHDEVICETOKEN_REGEX,
  CIO_DIDREGISTERFORREMOTENOTIFICATIONSWITHDEVICETOKEN_SNIPPET,
  CIO_PUSHNOTIFICATIONHANDLERDECLARATION_SNIPPET,
  CIO_WILLPRESENTNOTIFICATIONHANDLER_SNIPPET,
} from '../helpers/constants/ios';
import {
  injectCodeByLineNumber,
  injectCodeByMultiLineRegex,
  injectCodeByMultiLineRegexAndReplaceLine,
} from '../helpers/utils/codeInjection';
import { FileManagement } from '../helpers/utils/fileManagement';

const pushCodeSnippets = [
  CIO_DIDRECEIVENOTIFICATIONRESPONSEHANDLER_SNIPPET,
  CIO_WILLPRESENTNOTIFICATIONHANDLER_SNIPPET,
];

const additionalMethodsForPushNotifications = `${pushCodeSnippets.join(
  '\n'
)}\n`; // Join w/ newlines and ensure a newline at the end.

const addImport = (stringContents: string, appName: string) => {
  const importRegex = /^(#import .*)\n/gm;
  const addedImport = `
// Add swift bridge imports
#import <ExpoModulesCore-Swift.h>
#import <${appName}-Swift.h>
  `;

  const match = stringContents.match(importRegex);
  let endOfMatchIndex: number;
  if (!match || match.index === undefined) {
    // No imports found, just add to start of file:
    endOfMatchIndex = 0;
  } else {
    // Add after first import:
    endOfMatchIndex = match.index + match[0].length;
  }

  stringContents = injectCodeByLineNumber(
    stringContents,
    endOfMatchIndex,
    addedImport
  ).join('\n');

  return stringContents;
};

const addNotificationHandlerDeclaration = (stringContents: string) => {
  stringContents = injectCodeByMultiLineRegex(
    stringContents,
    CIO_APPDELEGATEDECLARATION_REGEX,
    CIO_PUSHNOTIFICATIONHANDLERDECLARATION_SNIPPET
  );

  return stringContents;
};

const addNotificationConfiguration = (stringContents: string) => {
  stringContents = injectCodeByMultiLineRegex(
    stringContents,
    CIO_DIDFINISHLAUNCHINGMETHOD_REGEX,
    CIO_CONFIGURECIOSDKPUSHNOTIFICATION_SNIPPET
  );

  return stringContents;
};

const addDidFailToRegisterForRemoteNotificationsWithError = (
  stringContents: string
) => {
  stringContents = injectCodeByMultiLineRegexAndReplaceLine(
    stringContents,
    CIO_DIDFAILTOREGISTERFORREMOTENOTIFICATIONSWITHERROR_REGEX,
    CIO_DIDFAILTOREGISTERFORREMOTENOTIFICATIONSWITHERROR_SNIPPET
  );

  return stringContents;
};

const AddDidRegisterForRemoteNotificationsWithDeviceToken = (
  stringContents: string
) => {
  stringContents = injectCodeByMultiLineRegexAndReplaceLine(
    stringContents,
    CIO_DIDREGISTERFORREMOTENOTIFICATIONSWITHDEVICETOKEN_REGEX,
    CIO_DIDREGISTERFORREMOTENOTIFICATIONSWITHDEVICETOKEN_SNIPPET
  );

  return stringContents;
};

const addAdditionalMethodsForPushNotifications = (stringContents: string) => {
  stringContents = injectCodeByMultiLineRegex(
    stringContents,
    CIO_DIDFAILTOREGISTERFORREMOTENOTIFICATIONSWITHERRORFULL_REGEX,
    additionalMethodsForPushNotifications
  );

  return stringContents;
};

const addAppdelegateHeaderModification = (stringContents: string) => {
  stringContents = injectCodeByMultiLineRegexAndReplaceLine(
    stringContents,
    CIO_APPDELEGATEHEADER_REGEX,
    CIO_APPDELEGATEHEADER_SNIPPET
  );

  return stringContents;
};

export const withAppDelegateModifications: ConfigPlugin<any> = (
  configOuter
) => {
  return withAppDelegate(configOuter, async (config) => {
    let stringContents = config.modResults.contents;
    const headerPath = getAppDelegateHeaderFilePath(
      config.modRequest.projectRoot
    );
    let headerContent = await FileManagement.read(headerPath);
    headerContent = addAppdelegateHeaderModification(headerContent);
    FileManagement.write(headerPath, headerContent);

    stringContents = addImport(
      stringContents,
      config.modRequest.projectName as string,
    );
    stringContents = addNotificationHandlerDeclaration(stringContents);
    stringContents = addNotificationConfiguration(stringContents);
    stringContents = addAdditionalMethodsForPushNotifications(stringContents);
    stringContents =
      addDidFailToRegisterForRemoteNotificationsWithError(stringContents);
    stringContents =
      AddDidRegisterForRemoteNotificationsWithDeviceToken(stringContents);

    config.modResults.contents = stringContents;
    return config;
  });
};
