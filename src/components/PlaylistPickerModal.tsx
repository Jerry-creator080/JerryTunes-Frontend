import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { useLibrary } from '../context/LibraryContext';
import { Track } from '../context/AudioContext';
import { IconButton } from './IconButton';

interface PlaylistPickerModalProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
}

export const PlaylistPickerModal = ({ visible, track, onClose }: PlaylistPickerModalProps) => {
  const { colors, typography, spacing, radius } = useTheme();
  const { playlists, addTrackToPlaylist, createPlaylist } = useLibrary();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = async () => {
    if (newPlaylistName.trim()) {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const handleSelect = async (playlistId: string) => {
    if (track) {
      await addTrackToPlaylist(playlistId, track);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.content, { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.md }]}>
          <View style={[styles.header, { marginBottom: spacing.md }]}>
            <Text style={{ color: colors.text, fontSize: typography.sizes.lg, fontWeight: typography.weights.bold as any }}>Add to Playlist</Text>
            <IconButton name="close" size={24} onPress={onClose} />
          </View>

          {isCreating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <TextInput 
                style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, flex: 1, marginRight: spacing.sm }]}
                placeholder="New Playlist Name"
                placeholderTextColor={colors.textSecondary}
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
              />
              <TouchableOpacity onPress={handleCreate} style={{ backgroundColor: colors.primary, padding: spacing.sm, borderRadius: radius.md }}>
                <Text style={{ color: 'white', fontWeight: '600' }}>Create</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.createBtn, { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
              onPress={() => setIsCreating(true)}
            >
              <IconButton name="add" size={24} color={colors.primary} />
              <Text style={{ color: colors.primary, marginLeft: spacing.sm, fontSize: typography.sizes.md, fontWeight: '500' }}>New Playlist</Text>
            </TouchableOpacity>
          )}

          <FlatList 
            data={playlists}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={{ padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                onPress={() => handleSelect(item.id)}
              >
                <Text style={{ color: colors.text, fontSize: typography.sizes.md }}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sizes.sm }}>{item.tracks.length} tracks</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl }}>No playlists yet</Text>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
  }
});
