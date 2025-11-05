import React from 'react';

const withClassName = (WrappedComponent) => {
    const WithClassName = ({ className, ...props }) => (
        <WrappedComponent {...props} className={className}>
            {React.Children.map(props.children, (child) =>
                React.cloneElement(child, { className })
            )}
        </WrappedComponent>
    );
    WithClassName.displayName = `WithClassName(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    return WithClassName;
};

export default withClassName;