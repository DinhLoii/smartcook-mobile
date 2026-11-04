import type { ReactNode } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

const FONT_FACES_CSS = `
@font-face {
  font-family: 'ionicons';
  src: url('/assets/Ionicons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Ionicons';
  src: url('/assets/Ionicons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'material-community';
  src: url('/assets/MaterialCommunityIcons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'MaterialCommunityIcons';
  src: url('/assets/MaterialCommunityIcons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5Free-Solid';
  src: url('/assets/FontAwesome5_Solid.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5_Solid';
  src: url('/assets/FontAwesome5_Solid.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5Free-Regular';
  src: url('/assets/FontAwesome5_Regular.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5_Regular';
  src: url('/assets/FontAwesome5_Regular.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5Free-Brand';
  src: url('/assets/FontAwesome5_Brands.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5Brands-Regular';
  src: url('/assets/FontAwesome5_Brands.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome5_Brands';
  src: url('/assets/FontAwesome5_Brands.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome6Free-Solid';
  src: url('/assets/FontAwesome6_Solid.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Solid.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome6Free-Regular';
  src: url('/assets/FontAwesome6_Regular.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Regular.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome6Brands-Regular';
  src: url('/assets/FontAwesome6_Brands.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome6_Brands.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'FontAwesome';
  src: url('/assets/FontAwesome.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'feather';
  src: url('/assets/Feather.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Feather';
  src: url('/assets/Feather.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'material';
  src: url('/assets/MaterialIcons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'MaterialIcons';
  src: url('/assets/MaterialIcons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'anticon';
  src: url('/assets/AntDesign.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'AntDesign';
  src: url('/assets/AntDesign.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'entypo';
  src: url('/assets/Entypo.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Entypo';
  src: url('/assets/Entypo.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'evilicons';
  src: url('/assets/EvilIcons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/EvilIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'Fontisto';
  src: url('/assets/Fontisto.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Fontisto.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'foundation';
  src: url('/assets/Foundation.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Foundation.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'octicons';
  src: url('/assets/Octicons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Octicons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'simple-line-icons';
  src: url('/assets/SimpleLineIcons.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.ttf') format('truetype');
  font-display: swap;
}
@font-face {
  font-family: 'zocial';
  src: url('/assets/Zocial.ttf') format('truetype'),
       url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@15.0.2/build/vendor/react-native-vector-icons/Fonts/Zocial.ttf') format('truetype');
  font-display: swap;
}
`;

export default function HTML({ children }: { children?: ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1, user-scalable=no"
        />
        <meta name="description" content="Ứng dụng nấu ăn thông minh" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SmartCook" />
        <meta name="theme-color" content="#ff6b35" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="icon" href="/icon-180.png" />
        <link rel="apple-touch-startup-image" href="/splash/splash-375x667@2x.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-390x844@3x.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-393x852@3x.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-402x874@3x.png" media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-414x896@2x.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-414x896@3x.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-428x926@3x.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-430x932@3x.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-440x956@3x.png" media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)" />
        <ScrollViewStyleReset />
        <style id="expo-generated-fonts" dangerouslySetInnerHTML={{ __html: FONT_FACES_CSS }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
