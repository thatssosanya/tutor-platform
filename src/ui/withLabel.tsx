import React, { type ElementType } from "react"

import { LabelBox } from "./LabelBox"

export type WithLabelProps = {
  label?: string
  labelAs?: ElementType
}

export const withLabel = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const WithLabelComponent: React.FC<P & WithLabelProps> = ({
    labelAs,
    ...props
  }) => {
    const renderedComponent = <WrappedComponent {...(props as P)} />
    if (!props.label) {
      return renderedComponent
    }

    return (
      <LabelBox label={props.label} labelAs={labelAs}>
        <WrappedComponent {...(props as P)} />
      </LabelBox>
    )
  }

  return WithLabelComponent
}
