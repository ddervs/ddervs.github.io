---
layout: post
title: Is it a banger? Make your own dataset
date: 2018-01-18 12:14:01
author: ddervs
short_description: The companion notebook to `is-it-a-banger`, this shows how to create the dataset used in the article.
---

These are some brief instructions on how to make the dataset I used in the article [Is it a banger?](https://nbviewer.jupyter.org/github/ddervs/is_it_a_banger/blob/master/scripts/is_it_a_banger.ipynb).

I'm also going to assume you have downloaded the files in the [GitHub repository](https://github.com/ddervs/is_it_a_banger).

## Folder structure

We want to create a directory called `data`, with a subdirectory for each label, e.g.

```
data
├── label_1
├── label_2
├──    ·
├──    ·
├──    ·
└── label_k
```

In each label subdirectory, we have a text-file, where each line is the URL of a YouTube track or playlist with the relevant audio data. 

For the article, we simply have

```
data
├── banger
│   └── URL_banger.txt
└── not_a_banger
    └── URL_not_a_banger.txt
```

You can see the URLs used in the article at [URL_banger.txt](https://github.com/ddervs/is_it_a_banger/blob/master/data/banger/URL_banger.txt) and [URL_not_a_banger.txt](https://github.com/ddervs/is_it_a_banger/blob/master/data/not_a_banger/URL_not_a_banger.txt)

We then need to run the following command in the directory `is_it_a_banger/scripts/`

```bash
./scripts/prepare_data_files.sh data 5
```

where `5` is the audio segment length in seconds. Note that this script requires `ffmpeg` and `youtube-dl` to work.

After running the script, you should have in each label subdirectory a bunch of 5 second `.wav` audio files.

We then need the following python to generate the pandas DataFrame from the generated audio files.

## Imports

```python
    import os
    import glob
    import librosa
    import numpy as np
    np.random.seed(1234)
    import pandas as pd
```
## Get filenames and directories

```python
    parent_dir = '../data'
    parent_dir_contents = [os.path.join(parent_dir, dirname) for dirname in os.listdir(parent_dir)]
    sub_dirs = [filename if os.path.isdir(filename) else None for filename in parent_dir_contents]
    sub_dirs = list(filter(None.__ne__, sub_dirs))
    labels_list = [os.path.relpath(path, parent_dir) for path in sub_dirs]
```
## Extract Features

We're going to use the `librosa` library for processing the audio signal. We'll keep the raw audio samples and compute a log spectrogram.

Note that we clip samples at the end of the audio file, as the combination of running `ffmpeg` earlier and resampling to 22.05kHz means the audio sample arrays don't have uniform length.

```python
    def extract_features(file_name, sample_rate=22050, segment_time=5, samples_to_clip=500):
        audio, sample_rate = librosa.load(file_name, sr=sample_rate)
        end_idx = (sample_rate * segment_time) - samples_to_clip # remove some end samples as not strictly uniform size
        audio = audio[0:end_idx]
        log_specgram = librosa.logamplitude(np.abs(librosa.stft(audio))**2, ref_power=np.max)
        features = {"audio": audio, "log_specgram": log_specgram}
        return features
```
## Turn labels into 'one-hot' vector encoding

```python
    def one_hot_encode(label, labels_list):
        n_labels = len(labels_list)
        one_hot_encoded = np.zeros(n_labels)
        for idx, cmp in enumerate(labels_list):
            if label == cmp:
                one_hot_encoded[idx] = 1                     
        return one_hot_encoded
```
## Trim file list

Only include a fraction of audio files for a given track to avoid training set 1) having too many highly correlated data points, and 2) having too large a file size.

```python
    def trim_file_list(fnames_list, p_include=1.0):
        fnames_list = np.asarray(fnames_list)
        include = np.random.rand(*fnames_list.shape)
        fnames_list = fnames_list[include < p_include]
        return fnames_list
```
## Build DataFrame from files

```python
    def parse_audio_files(parent_dir, sub_dirs_list, labels_list, file_ext='*.wav', p_include=1.0,\
                          sample_rate=22050, segment_time=5, samples_to_clip=500):
        data = []
        index = []
        for label_idx, sub_dir in enumerate(sub_dirs_list):
            fnames_list = glob.glob(os.path.join(sub_dir, file_ext))
            fnames_list = trim_file_list(fnames_list, p_include=p_include)
            for fname in fnames_list:
                print("Processing " + os.path.basename(fname))
                features = extract_features(fname, segment_time=segment_time, \
                                            sample_rate=sample_rate, samples_to_clip=samples_to_clip)
                label = labels_list[label_idx]
                label_one_hot = one_hot_encode(label, labels_list)
                features['label'] = label
                features["label_one_hot"] = label_one_hot
                data.append(features)
                index.append(os.path.basename(fname))
        return pd.DataFrame(data, index=index)


    df = parse_audio_files(parent_dir, sub_dirs, labels_list, p_include=0.1, segment_time=5, samples_to_clip=1100)
    df = df.iloc[np.random.permutation(len(df))] # shuffle rows
    df.to_pickle(os.path.join(parent_dir, 'processed_dataset.pkl'))
```