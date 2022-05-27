import * as React from 'react';
import Alert from '@mui/material/Alert';
import TabPanel from './components/TabPanel';
import { Images, Image } from './Images';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LinearProgress from '@mui/material/LinearProgress';

import { createDockerDesktopClient } from '@docker/extension-api-client';

const REGISTRY = 'containers.intersystems.com';

interface DockerLSRepository {
  repository: string;
  tags: string[];
}

interface DockerLSResponse {
  repositories: DockerLSRepository[];
}

const setFlags = (repo: { name: string; tags: string[] }): Image => {
  const { name, tags } = repo;
  const arch = repo.name.endsWith('-arm64') ? 'arm64' : 'x64';
  const repoParts = repo.name.split('-');
  const kind =
    repo.name.startsWith('iris') && repo.name !== 'iris-operator'
      ? 'iris'
      : 'tools';
  const edition =
    kind === 'iris'
      ? repoParts.includes('community')
        ? 'community'
        : 'general'
      : 'any';
  const repository = `${REGISTRY}/intersystems`;
  return {
    repository,
    name,
    fullName: `${repository}/${name}`,
    tags,
    arch,
    edition,
    kind,
  };
};

const getImages = (data: DockerLSResponse) => {
  return data.repositories
    .map((repo) => ({
      name: repo.repository.split('/')[1],
      tags: repo.tags,
    }))
    .map((repo) => setFlags(repo));
};

let ddClientError = '';
try {
  var ddClient = createDockerDesktopClient();
} catch (err) {
  ddClientError = err.message;
}
var imagesLoaded = false;

interface DockerImage {
  RepoTags: string[];
}
export function App() {
  const importData = async (): Promise<DockerLSResponse> => {
    if (localStorage.hasOwnProperty(REGISTRY)) {
      return Promise.resolve(JSON.parse(localStorage.getItem(REGISTRY) || ''));
    }
    return fetch('all.json').then((res) => res.json());
  };

  const [value, setValue] = React.useState(0);
  const [errorMsg] = React.useState(ddClientError);
  const [images, setImages] = React.useState<Image[]>([]);
  const [loaded, setLoaded] = React.useState<string[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  if (!imagesLoaded) {
    importData().then((images) => setImages(getImages(images)));
  }
  if (!imagesLoaded && ddClient?.extension?.host) {
    setLoading(true);
    imagesLoaded = true;
    ddClient.extension.host.cli
      .exec('docker-ls', [
        '--registry',
        `https://${REGISTRY}`,
        'repositories',
        '-j',
        '-l',
        '1',
      ])
      .then(({ stdout }) => {
        localStorage.setItem(REGISTRY, stdout);
        return getImages(JSON.parse(stdout));
      })
      .then((images) => setImages(images))
      .catch((err) => {
        ddClient.desktopUI.toast.error(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
    ddClient.docker
      .listImages()
      .then((list) => {
        return (list as DockerImage[])
          .flatMap((el) => el.RepoTags)
          .filter((el) => el.startsWith(REGISTRY));
      })
      .then((list) => {
        setLoaded(list);
      });
  }

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const pullImage = (image: string, tag: string) => {
    const fullName = `${image}:${tag}`;
    setLoaded([...(loaded || []), fullName]);
    ddClient?.docker.cli
      .exec('pull', [fullName])
      .then(() =>
        ddClient.desktopUI.toast.success(`Docker image ${fullName} pulled`),
      );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
      <Box>
        <Tabs value={value} onChange={handleChange}>
          <Tab label="IRIS" value={0} />
          <Tab label="TOOLS" value={1} />
        </Tabs>
      </Box>
      {loading && <LinearProgress />}
      <Box>
        <TabPanel value={value} index={0}>
          <Images
            images={images}
            loaded={loaded}
            kind={'iris'}
            onPull={ddClient ? pullImage : null}
          />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <Images
            images={images}
            loaded={loaded}
            kind={'tools'}
            onPull={ddClient ? pullImage : null}
          />
        </TabPanel>
      </Box>
    </Box>
  );
}
