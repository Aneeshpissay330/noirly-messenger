import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import Personal from './Personal';

// const Tab = createMaterialTopTabNavigator();

const Chat = () => {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors?.background }}>
      <Personal />
    </View>
  );
  // return (
  //   <Tab.Navigator
  //     screenOptions={{
  //       tabBarStyle: { backgroundColor: theme.colors?.background },
  //       tabBarLabelStyle: { fontWeight: 'bold', color: (theme.colors as any)?.onSurface ?? theme.colors?.primary },
  //       sceneStyle: { backgroundColor: theme.colors?.background },
  //     }}
  //   >
  //     <Tab.Screen name="Personal" component={Personal} />
  //     <Tab.Screen name="Group" component={Group} />
  //   </Tab.Navigator>
  // );
};

export default Chat;
