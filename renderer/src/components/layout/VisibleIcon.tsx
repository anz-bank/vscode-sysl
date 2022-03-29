import React from "react";

import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

type Props = {
  visibilityIconOn: boolean,
  isVisible: boolean,
  nodeName: string,
}

/**
 * Renders either an open-eye or a closed-eye icon indicating whether the given node in the props is
 * visible or hidden, as well as the icon itself being visible or hidden depending on if mouse is hovered.
 */
export default function VisibleIcon(props: Props) {
  return props.visibilityIconOn ?
    <VisibilityIcon
      data-testid={props.nodeName + "-vis-on-icon"}
      visibility={props.isVisible ? 1 : "hidden"}
			fontSize="inherit"
		/> :
		<VisibilityOffIcon
			data-testid={props.nodeName + "-vis-off-icon"}
			visibility={1}
			fontSize="inherit"
		/>;
}
