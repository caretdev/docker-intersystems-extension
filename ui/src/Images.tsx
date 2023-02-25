import * as React from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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
import Tooltip from '@mui/material/Tooltip';
import Input from '@mui/material/Input';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import LockIcon from '@mui/icons-material/Lock';
import { Link, Grid, CircularProgress } from '@mui/material';
import { PublicOutlined } from '@mui/icons-material';

// export type State = 'idle' | 'pull' | 'rm' | 'inuse' | 'nope';
export interface ImageState {
  [key: string]: string;
}

interface ImagesProps {
  images: Image[];
  imagesState: ImageState;
  root: 'intersystems' | 'iscinternal';
  kind: 'iris' | 'tools';
  arm?: boolean;
  community?: boolean;
  onPull: ((image: string, tag: string) => void) | null;
  onDelete: ((image: string, tag: string) => void) | null;
  onCopy: ((value: string) => void) | null;
}

type RepositoryKind = 'iris' | 'tools';
type RepositoryEdition = 'any' | 'general' | 'community';
export interface RepositoryArch {
  'arm64': string[];
  'amd64': string[];
}

export interface Image {
  repository: string;
  root: string;
  name: string;
  fullName: string;
  arch: RepositoryArch;
  edition: RepositoryEdition;
  kind: RepositoryKind;
  publicAccess: boolean;
}

const sortVersions = (a: string, b: string) => {
  if ('latest' === a) {
    return 1;
  }
  if ('latest' === b) {
    return -1;
  }
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

const sortTags = (tags: string[], uniqueMajor: boolean) => {
  if (tags.length === 1) {
    return tags;
  }
  // if (tags[0].split('.').length !== 5) {
  //   return tags;
  // }
  // if (!/20\d\d/.test(tags[0].split('.')[0])) {
  //   return tags;
  // }
  const sorted = tags.sort(sortVersions).reverse();
  if (!uniqueMajor) {
    return sorted;
  }
  let prev = sorted[0];
  const unique = [prev];
  for (let i = 1; i < sorted.length; i++) {
    const version = sorted[i];
    if (
      version.split('.').slice(0, 2).join('.') !==
      prev.split('.').slice(0, 2).join('.')
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

const isARM =
  window.navigator.platform.startsWith('Mac') &&
  !window.navigator.platform.endsWith('Intel');

export function Images(props: ImagesProps) {
  const { kind, images, imagesState, root } = props;
  const [community, setCommunity] = React.useState(true);
  const [arm, setArm] = React.useState(isARM);
  const [uniqueMajor, setUniqueMajor] = React.useState(true);
  const [filterName, setFilterName] = React.useState('');
  const [filterTag, setFilterTag] = React.useState('');
  const [seeMore, setSeeMore] = React.useState<{ [key: string]: boolean }>({});

  const filterImages = (images: Image[]) => {
    const result = images
      .filter((repo) => kind && kind === repo.kind)
      .filter((repo) => root && root === repo.root)
      .filter((repo) =>
        community
          ? ['community', 'any'].includes(repo.edition)
          : ['general', 'any'].includes(repo.edition),
      )
      // .filter((repo) =>
      //   arm
      //     ? ['arm64', 'any'].includes(repo.arch)
      //     : ['x64', 'any'].includes(repo.arch),
      // )
      .filter((repo) => !filterName || repo.name.includes(filterName))
      .map((repo) => ({
        ...repo,
        tags: sortTags(repo.arch[arm ? 'arm64' : 'amd64'], uniqueMajor).filter(
          (tag) => tag && (!filterTag || tag.includes(filterTag)),
        ),
      }));
    return result;
  };

  const action = (fullName: string, tag: string) => {
    const imageState = imagesState[`${fullName}:${tag}`] || 'nope';
    const [name, value] = imageState.split(':');
    switch (name) {
      case 'idle':
        return (
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => props.onDelete && props.onDelete(fullName, tag)}
          >
            Delete
          </Button>
        );

      case 'rm':
      case 'pull':
        return (
          <Button size="small" disabled={true} variant="contained">
            <CircularProgress
              color="inherit"
              size={16}
              variant={value ? 'determinate' : 'indeterminate'}
              value={parseInt(value, 10)}
            />
            &nbsp;{value ? `${value}%` : ''}
          </Button>
        );

      case 'nope':
        return (
          <Button
            size="small"
            variant="contained"
            onClick={() => props.onPull && props.onPull(fullName, tag)}
          >
            Pull
          </Button>
        );
      default:
        return <></>;
    }
  };

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
            <Tooltip title="e.g. 2022.1.*, 2021.2.*, 20221.1.*, 1.1.*, 0.1.*">
              <FormControlLabel
                sx={{ alignSelf: 'flex-end' }}
                control={
                  <Switch
                    checked={uniqueMajor}
                    onChange={(e) => setUniqueMajor(e.target.checked)}
                  />
                }
                label="Major versions"
                labelPlacement="start"
              />
            </Tooltip>
          </FormGroup>
        </FormControl>
      </Box>
      <TableContainer
        sx={{
          maxHeight: 'calc(100vh - 186px)',
        }}
      >
        <Table
          stickyHeader
          size="small"
          padding="normal"
          sx={{ whiteSpace: 'nowrap' }}
        >
          <TableHead>
            <TableRow>
              <TableCell>
                <FormControl
                  fullWidth
                  sx={{ minWidth: '30ch' }}
                  variant="standard"
                >
                  <InputLabel htmlFor="standard-adornment-password">
                    NAME
                  </InputLabel>
                  <Input
                    id="filter-name"
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    endAdornment={
                      <InputAdornment position="end">
                        {filterName ? (
                          <IconButton onClick={() => setFilterName('')}>
                            <ClearOutlinedIcon />
                          </IconButton>
                        ) : (
                          <SearchOutlinedIcon />
                        )}
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </TableCell>
              <TableCell>
                <FormControl
                  fullWidth
                  sx={{ minWidth: '20ch' }}
                  variant="standard"
                >
                  <InputLabel htmlFor="standard-adornment-password">
                    TAGS
                  </InputLabel>
                  <Input
                    type="text"
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    endAdornment={
                      <InputAdornment position="end">
                        {filterTag ? (
                          <IconButton onClick={() => setFilterTag('')}>
                            <ClearOutlinedIcon />
                          </IconButton>
                        ) : (
                          <SearchOutlinedIcon />
                        )}
                      </InputAdornment>
                    }
                  />
                </FormControl>
              </TableCell>
              {/* <TableCell>SIZE</TableCell> */}
              {/* <TableCell>LAST PUSHED</TableCell> */}
              <TableCell width={'100%'}></TableCell>
            </TableRow>
          </TableHead>
          {filterImages(images).map((image) => (
            <TableBody key={image.name}>
              {image.tags.map((tag, ind) =>
                !seeMore[image.fullName] && ind > 2 ? null : (
                  <TableRow
                    hover
                    key={`${image.name}:${tag}`}
                    sx={{
                      '&:not(:last-child) td': { border: 0 },
                    }}
                  >
                    <TableCell>
                      {ind === 0 && (
                        <Grid
                          container
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{
                            flexWrap: 'nowrap',
                          }}
                        >
                          <Grid item>
                            {image.publicAccess ? (
                              <PublicOutlined />
                            ) : (
                              <LockIcon />
                            )}
                          </Grid>
                          <Grid item>
                            <b>{image.fullName}</b>
                          </Grid>
                        </Grid>
                      )}
                    </TableCell>
                    <TableCell
                      sx={{
                        '&:hover .hover-btn': {
                          visibility: 'visible',
                        },
                      }}
                    >
                      {irisTag(tag)}
                      {props.onCopy && (
                        <Tooltip title="Copy image name with tag to clipboard">
                          <IconButton
                            className="hover-btn"
                            sx={{ visibility: 'hidden' }}
                            onClick={() =>
                              props.onCopy &&
                              props.onCopy(`${image.fullName}:${tag}`)
                            }
                          >
                            <ContentCopyOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    {/* <TableCell></TableCell> */}
                    {/* <TableCell></TableCell> */}
                    <TableCell align="right">
                      {action(image.fullName, tag)}
                    </TableCell>
                  </TableRow>
                ),
              )}
              {!seeMore[image.fullName] && image.tags.length > 3 && (
                <TableRow
                  sx={{
                    '&:not(:nth-of-type(n+4))': { display: 'none' },
                  }}
                >
                  <TableCell />
                  <TableCell colSpan={2}>
                    <Link
                      variant="body1"
                      href="#"
                      underline="none"
                      onClick={() =>
                        setSeeMore({ ...seeMore, [image.fullName]: true })
                      }
                    >
                      <b>See more</b>
                    </Link>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          ))}
        </Table>
      </TableContainer>
    </Box>
  );
}
