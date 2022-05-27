import * as React from 'react';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Box } from '@mui/system';
import Switch from '@mui/material/Switch';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';

interface ImagesProps {
  images: Image[];
  loaded: string[] | null;
  kind: 'iris' | 'tools';
  arm?: boolean;
  community?: boolean;
  onPull: ((image: string, tag: string) => void) | null;
}

type RepositoryKind = 'iris' | 'tools';
type RepositoryEdition = 'any' | 'general' | 'community';
type RepositoryArch = 'any' | 'x64' | 'arm64';

export interface Image {
  repository: string;
  name: string;
  fullName: string;
  tags: string[];
  arch: RepositoryArch;
  edition: RepositoryEdition;
  kind: RepositoryKind;
}

const sortVersions = (a: string, b: string) => {
  var a1 = a.split('.');
  var b1 = b.split('.');
  var len = Math.max(a1.length, b1.length);

  for (var i = 0; i < len; i++) {
    var _a = +a1[i] || 0;
    var _b = +b1[i] || 0;
    if (_a === _b) continue;
    else return _a > _b ? 1 : -1;
  }
  return 0;
};

const sortIRISTags = (tags: string[], uniqueMajor: boolean) => {
  if (tags.length === 1) {
    return tags;
  }
  if (tags[0].split('.').length !== 5) {
    return tags;
  }
  if (!/20\d\d/.test(tags[0].split('.')[0])) {
    return tags;
  }
  const sorted = tags.sort(sortVersions).reverse();
  if (!uniqueMajor) {
    return sorted;
  }
  let prev = sorted[0];
  const unique = [prev];
  for (let i = 1; i < sorted.length; i++) {
    const version = sorted[i];
    if (
      version.split('.').slice(0, 1).join('.') !==
      prev.split('.').slice(0, 1).join('.')
    ) {
      unique.push(version);
    }
    prev = version;
  }
  return unique;
};

const irisTag = (tag: string) => {
  const tagList = tag.split('.');
  if (!/20\d\d/.test(tagList[0])) {
    return tag;
  }
  const main = tagList.slice(0, 2).join('.');
  const left = tagList.slice(2).join('.');
  return (
    <>
      <b>{main}</b>.{left}
    </>
  );
};

const filterImages = (
  images: Image[],
  kind: RepositoryKind,
  community: boolean,
  arm: boolean,
  uniqueMajor: boolean,
) => {
  const result = images
    .filter((repo) => kind && kind === repo.kind)
    .filter((repo) =>
      community
        ? ['community', 'any'].includes(repo.edition)
        : ['general', 'any'].includes(repo.edition),
    )
    .filter((repo) =>
      arm
        ? ['arm64', 'any'].includes(repo.arch)
        : ['x64', 'any'].includes(repo.arch),
    )
    .map((repo) => ({
      ...repo,
      tags: sortIRISTags(repo.tags, uniqueMajor),
    }));
  return result;
};

const isARM =
  window.navigator.platform.startsWith('Mac') &&
  !window.navigator.platform.endsWith('Intel');

export function Images(props: ImagesProps) {
  const { kind, images, loaded } = props;
  const [community, setCommunity] = React.useState(
    !images.find((image) => image.name === 'iris'),
  );
  const [arm, setArm] = React.useState(isARM);
  const [uniqueMajor, setUniqueMajor] = React.useState(true);

  return (
    <Box>
      <Box>
        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormGroup aria-label="position" row sx={{ display: 'flex' }}>
            {kind === 'iris' && (
              <FormControlLabel
                value="community"
                control={
                  <Switch
                    checked={community}
                    onChange={(e) => setCommunity(e.target.checked)}
                  />
                }
                label="Community"
                labelPlacement="start"
              />
            )}
            <FormControlLabel
              value="arm64"
              control={
                <Switch
                  checked={arm}
                  onChange={(e) => setArm(e.target.checked)}
                />
              }
              label="ARM64"
              labelPlacement="start"
            />
            <span></span>
            <FormControlLabel
              sx={{ alignSelf: 'flex-end' }}
              control={
                <Switch
                  checked={uniqueMajor}
                  onChange={(e) => setUniqueMajor(e.target.checked)}
                />
              }
              label="Major versions only"
              labelPlacement="start"
            />
          </FormGroup>
        </FormControl>
      </Box>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 120px)' }}>
        <Table
          stickyHeader
          size="small"
          padding="normal"
          sx={{ whiteSpace: 'nowrap' }}
        >
          <TableHead>
            <TableRow>
              <TableCell>NAME</TableCell>
              <TableCell>TAGS</TableCell>
              {/* <TableCell>SIZE</TableCell> */}
              {/* <TableCell>LAST PUSHED</TableCell> */}
              <TableCell width={'100%'}></TableCell>
            </TableRow>
          </TableHead>
          {filterImages(images, kind, community, arm, uniqueMajor).map(
            (image) => (
              <TableBody key={image.name}>
                {image.tags.map((tag, ind) => (
                  <TableRow
                    hover
                    key={`${image.name}:${tag}`}
                    sx={{ '&:not(:last-child) td': { border: 0 } }}
                  >
                    <TableCell>
                      {ind === 0 && <b> {image.fullName}</b>}
                    </TableCell>
                    <TableCell>{irisTag(tag)}</TableCell>
                    {/* <TableCell></TableCell> */}
                    {/* <TableCell></TableCell> */}
                    <TableCell align="right">
                      {props.onPull &&
                        loaded &&
                        !loaded.includes(`${image.fullName}:${tag}`) && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() =>
                              props.onPull && props.onPull(image.fullName, tag)
                            }
                          >
                            Pull
                          </Button>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ),
          )}
        </Table>
      </TableContainer>
    </Box>
  );
}
