import React, { useState } from 'react';
import { useLibrary } from '../context/LibraryContext';
import { useOffline } from '../context/OfflineContext';
import { Track } from '../context/AudioContext';
import { ActionSheet } from './ActionSheet';
import { PlaylistPickerModal } from './PlaylistPickerModal';
import { useNavigation } from '@react-navigation/native';

interface TrackOptionsSheetProps {
  track: Track | null;
  onClose: () => void;
}

export const TrackOptionsSheet = ({ track, onClose }: TrackOptionsSheetProps) => {
  const { toggleFavorite, isFavorite } = useLibrary();
  const { downloadTrack } = useOffline();
  const navigation = useNavigation<any>();
  
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);

  if (!track) return null;

  const inLibrary = isFavorite(track.id);

  const handleToggleLibrary = async () => {
    await toggleFavorite(track);
    onClose();
  };

  const handleDownload = (format: 'mp3' | 'mp4_720' | 'mp4_1080') => {
    downloadTrack(track, format);
    onClose();
  };

  const options = [
    {
      label: inLibrary ? "Remove from Library" : "Add to Library",
      onPress: handleToggleLibrary,
    },
    {
      label: "Add to Playlist",
      onPress: () => setShowPlaylistPicker(true),
    },
    { 
      label: "Play Video", 
      onPress: () => {
        navigation.navigate('Video', { track });
        onClose();
      } 
    },
    { label: "Download Audio (MP3)", onPress: () => handleDownload('mp3') },
    { label: "Download Video (720p)", onPress: () => handleDownload('mp4_720') },
    { label: "Download Video (1080p)", onPress: () => handleDownload('mp4_1080') },
  ];

  return (
    <>
      <ActionSheet 
        visible={!!track && !showPlaylistPicker}
        title={track ? track.title : ''}
        options={options}
        onClose={onClose}
      />
      <PlaylistPickerModal 
        visible={showPlaylistPicker}
        track={track}
        onClose={() => {
          setShowPlaylistPicker(false);
          onClose();
        }}
      />
    </>
  );
};
