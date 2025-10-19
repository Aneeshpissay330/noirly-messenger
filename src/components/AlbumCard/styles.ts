import { StyleSheet } from 'react-native';
import { SPACING, ITEM_SIZE } from '../../utils/camera-roll';

export const styles = StyleSheet.create({
  albumCard: {
    marginBottom: SPACING * 2,
    overflow: 'hidden',
  },
  gridContainer: {
    paddingHorizontal: 0,
  },
  photoItemContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  photoItemContainerWithMargin: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: SPACING,
  },
});
