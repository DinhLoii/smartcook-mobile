import React, { ReactElement } from "react";
import { Keyboard, TouchableWithoutFeedback } from "react-native";

export default function DismissKeyboard({
  children,
}: {
  children: ReactElement;
}) {
  return (
    <TouchableWithoutFeedback
      accessible={false}
      onPress={Keyboard.dismiss}
      touchSoundDisabled
    >
      {children}
    </TouchableWithoutFeedback>
  );
}
