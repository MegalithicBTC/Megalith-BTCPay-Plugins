// OrderResult component - Shows results of a channel order
window.OrderResult = function(resultProps) {
  const { orderResult } = resultProps;  // Changed from 'result' to 'orderResult' to match the prop name in LSPS1App
  
  // Create state to store the latest order status updates and channel data
  const [orderStatus, setOrderStatus] = React.useState(null);
  const [lastPolled, setLastPolled] = React.useState(new Date());
  const [channelData, setChannelData] = React.useState([]);
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);
  
  // Effect to listen for status updates
  React.useEffect(() => {
    const handleStatusUpdate = (event) => {
      console.log("Order status update received:", event.detail);
      setOrderStatus(event.detail);
      setLastPolled(new Date());
    };
    
    document.addEventListener('order-status-updated', handleStatusUpdate);
    
    // Listen for channel update events from ChannelManager
    const handleChannelsUpdated = (event) => {
      console.log("Channels updated in OrderResult:", event.detail);
      setChannelData(event.detail);
    };
    
    document.addEventListener('channels-updated', handleChannelsUpdated);
    
    // Start polling for order status if we have a successful result with an orderId
    if (orderResult && orderResult.success && orderResult.orderId) {
      console.log("Starting order status polling for order:", orderResult.orderId);
      window.ChannelOrderManager.startOrderStatusPolling(orderResult.orderId);
    }
    
    return () => {
      document.removeEventListener('order-status-updated', handleStatusUpdate);
      document.removeEventListener('channels-updated', handleChannelsUpdated);
    };
  }, [orderResult]);
  
  // If we don't have a result yet, don't render anything
  if (!orderResult) {
    return null;
  }
  
  // Get the most current status data
  const currentStatusData = React.useMemo(() => {
    if (!orderStatus && !orderResult) return null;
    
    // If we have orderStatus, merge it with channel data
    if (orderStatus) {
      return {
        ...orderStatus,
        channelData: channelData.length > 0 ? channelData : null,
        paymentInfo: orderStatus.paymentInfo || orderResult.paymentInfo,
        data: orderStatus.data || orderResult.data
      };
    }
    
    // Otherwise just use the initial result
    return {
      ...orderResult
    };
  }, [orderStatus, orderResult, channelData]);
  
  // Handle page refresh for "Start Over Now" button
  const handleStartOver = () => {
    window.location.reload();
  };
  
  // Determine appropriate container class based on result and status
  const containerClass = React.useMemo(() => {
    // Check if order has failed
    const isFailed = currentStatusData?.order_state === "FAILED" || 
                    currentStatusData?.status === "failed";
    if (isFailed) return 'border border-danger rounded p-3';
    
    if (!orderResult.success) return 'border border-danger rounded p-3';
    
    // Check if order is completed
    const isCompleted = currentStatusData?.order_state === "COMPLETED" || 
                       currentStatusData?.status === "complete" || 
                       currentStatusData?.status === "completed";
                       
    if (isCompleted) return 'border border-success rounded p-3';
    // Use a more neutral background for invoice section (card with light border instead of alert-primary)
    if (currentStatusData?.status === 'waiting_for_payment') return 'border rounded bg-light p-3';
    return 'card p-3';
  }, [orderResult.success, currentStatusData]);
  
  // Check if we're showing an invoice (waiting for payment)
  const isShowingInvoice = React.useMemo(() => {
    return currentStatusData?.status === 'waiting_for_payment' || 
      (currentStatusData?.order_state && currentStatusData?.order_state.toUpperCase() === 'CREATED');
  }, [currentStatusData]);
  
  // Determine the heading and message based on status
  const { heading, message } = React.useMemo(() => {
    const isFailed = currentStatusData?.order_state === "FAILED" || 
                    currentStatusData?.status === "failed";
                    
    if (isFailed) {
      const orderId = currentStatusData?.orderId || currentStatusData?.details?.order_id;
      return {
        heading: 'Channel Opening Failed',
        message: `The channel order failed to complete. To troubleshoot, please contact ${window.LSPS1App?.props?.connectedLspName || "the LSP"} and inquire about order ID ${orderId}.`
      };
    }
    
    if (!orderResult.success || !currentStatusData?.order_state) {
      return {
        heading: 'Error',
        message: orderResult.message || 'Failed to get options for channel opening.'
      };
    }
    
    return {
      heading: 'Success!',
      message: orderResult.message || 'The LSP is opening your channel.'
    };
  }, [orderResult, currentStatusData]);
  
  return React.createElement('div', { className: containerClass },
    // Only show the heading/message if we're NOT showing an invoice
    !isShowingInvoice && React.createElement('div', { className: 'd-flex justify-content-between align-items-start' },
      React.createElement('div', null,
        React.createElement('h5', { className: 'mb-2' }, heading),
        React.createElement('p', { className: 'mb-0' }, message)
      )
    ),
    
    // Show status if we have data
    currentStatusData && window.OrderResultStatus ? 
      window.OrderResultStatus.renderStatus(currentStatusData, lastPolled) : null
  );
};

// Add static updateStatus method
window.OrderResult.updateStatus = function(status) {
  document.dispatchEvent(new CustomEvent('order-status-updated', { detail: status }));
};