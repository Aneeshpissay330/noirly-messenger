import { createStackNavigator } from '@react-navigation/stack';
import MediaTabs from '../../components/MediaTabs';
import { usePresenceHeartbeat } from '../../hooks/usePresenceHeartbeat';
import CameraScreen from '../../screens/Chat/CameraScreen';
import Gallery from '../../screens/Chat/Gallery';
import ChatViewGroup from '../../screens/Chat/Group/ChatViewGroup';
import GroupChatContact from '../../screens/Chat/Group/ChatViewGroup/GroupChatContact';
import MediaViewer from '../../screens/Chat/MediaViewer';
import VideoViewer from '../../screens/Chat/VideoViewer';
import ChatView from '../../screens/Chat/Personal/ChatView';
import PersonalChatContact from '../../screens/Chat/Personal/ChatView/PersonalChatContact';
import StarredMessages from '../../screens/Chat/Personal/Starred';
import ContactScreen from '../../screens/ContactScreen';
import EditProfile from '../../screens/Settings/EditProfile';
import { useTheme } from '../../theme';
import Tabs from '../tabs';

const Stack = createStackNavigator();

function Stacks() {
  const theme = useTheme();
  usePresenceHeartbeat();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          backgroundColor: theme.colors?.background,
        },
        headerTintColor:
          (theme.colors as any)?.onSurface ?? theme.colors?.primary,
        headerTitleStyle: {
          fontFamily: 'Lexend-Medium',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={Tabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="ChatView" component={ChatView} />
      <Stack.Screen name="ChatViewGroup" component={ChatViewGroup} />
      <Stack.Screen
        name="PersonalChatContact"
        component={PersonalChatContact}
        options={{ title: '' }}
      />
      <Stack.Screen name="GroupChatContact" component={GroupChatContact} />
      <Stack.Screen
        name="CameraScreen"
        component={CameraScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Gallery" component={Gallery} />
      <Stack.Screen
        name="MediaViewer"
        component={MediaViewer}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VideoViewer"
        component={VideoViewer}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MediaTabsScreen"
        component={MediaTabs}
        options={({ route }) => ({
          title: (route.params as any)?.name || 'User',
        })}
      />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen
        name="ContactScreen"
        component={ContactScreen}
        options={{ title: 'Contacts' }}
      />
      <Stack.Screen
        name="StarredMessages"
        component={StarredMessages}
        options={{ title: 'Starred' }}
      />
    </Stack.Navigator>
  );
}

export default Stacks;
